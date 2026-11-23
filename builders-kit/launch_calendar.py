#!/usr/bin/env python3
"""
launch_calendar.py: one calendar file for your whole launch run, for you and your followers.

A reminder is the most polite way to ask people to show up: they choose to add
it, and it arrives at the right time in their own time zone. The Marathon
shared one for every launch day. This script turns a small CSV into an .ics
file that Apple Calendar, Google Calendar and Outlook all import, plus an
"add to Google Calendar" link per launch for your posts.

Usage
  python3 launch_calendar.py launches.example.csv --out launches.ics
  python3 launch_calendar.py launches.example.csv --remind 30 --links

CSV columns
  name, date (YYYY-MM-DD), time (HH:MM), timezone (IANA, e.g. America/Los_Angeles),
  minutes (duration), url, description

Why the time zone matters
  Product Hunt days start at 00:01 Pacific time. Write the time as the launch
  platform sees it, with its own zone, and let every calendar app convert it.
  Never pre-convert to your local time by hand: daylight saving will bite.
"""
import argparse
import csv
import datetime as dt
import hashlib
import urllib.parse
from zoneinfo import ZoneInfo


def esc(s):
    """iCalendar needs commas, semicolons and newlines escaped."""
    return s.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


def fold(line):
    """Lines longer than 75 bytes must be folded with a leading space."""
    out, b = [], line.encode('utf-8')
    while len(b) > 75:
        cut = 75
        while (b[cut] & 0xC0) == 0x80:  # never split a UTF-8 character
            cut -= 1
        out.append(b[:cut].decode())
        b = b' ' + b[cut:]
    return '\r\n'.join(out + [b.decode()])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv')
    ap.add_argument('--out', default='launches.ics')
    ap.add_argument('--name', default='My launches')
    ap.add_argument('--remind', type=int, default=15, help='minutes before, 0 for none')
    ap.add_argument('--links', action='store_true', help='print Google Calendar links')
    a = ap.parse_args()

    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//builders-kit//launch_calendar.py//EN',
             'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + esc(a.name)]
    with open(a.csv, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            start = dt.datetime.fromisoformat(f"{r['date']}T{r['time']}").replace(tzinfo=ZoneInfo(r['timezone']))
            end = start + dt.timedelta(minutes=int(r.get('minutes') or 60))
            s, e = (t.astimezone(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') for t in (start, end))
            # A stable UID means re-importing an updated file moves the event
            # instead of duplicating it. Handy when a launch date shifts.
            uid = hashlib.sha1((r['name'] + r['url']).encode()).hexdigest()[:16] + '@builders-kit'
            desc = (r.get('description', '') + '\n\n' + r['url']).strip()
            lines += ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + stamp, 'DTSTART:' + s, 'DTEND:' + e,
                      'SUMMARY:' + esc(r['name']), 'DESCRIPTION:' + esc(desc), 'URL:' + r['url']]
            if a.remind:
                lines += ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(r['name']),
                          f'TRIGGER:-PT{a.remind}M', 'END:VALARM']
            lines.append('END:VEVENT')
            if a.links:
                q = urllib.parse.urlencode({'action': 'TEMPLATE', 'text': r['name'], 'dates': f'{s}/{e}', 'details': desc})
                print(f"{r['name']}: https://calendar.google.com/calendar/render?{q}")
    lines.append('END:VCALENDAR')
    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        f.write('\r\n'.join(fold(l) for l in lines) + '\r\n')
    print('saved', a.out)


if __name__ == '__main__':
    main()
