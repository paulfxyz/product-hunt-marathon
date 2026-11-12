import re,sys
R=[('data-launch="2026-11-22T16:00:00Z"','data-launch="2026-11-20T16:00:00Z"'),
# en
('free extras · Nov 17–22','free extras · Nov 17–20'),('17–22 NOVEMBER','17–20 NOVEMBER'),('Thursday 19 and Sunday 22 November','Thursday 19 and Friday 20 November'),
('<div class="pl-when">Sun<br/><b>22 Nov</b></div>','<div class="pl-when">Fri<br/><b>20 Nov</b></div>'),('10–19 Nov and 22 Nov.','10–20 Nov.'),('Sun 22 Nov · Goodie','Fri 20 Nov · Goodie'),('17, 18, 19 and 22 November','17, 18, 19 and 20 November'),
# fr
('extras gratuits · 17–22 nov.','extras gratuits · 17–20 nov.'),('17–22 NOVEMBRE','17–20 NOVEMBRE'),('jeudi 19 et dimanche 22 novembre','jeudi 19 et vendredi 20 novembre'),('<div class="pl-when">Dim.<br/><b>22 nov.</b></div>','<div class="pl-when">Ven.<br/><b>20 nov.</b></div>'),('10–19 nov. et 22 nov.','10–20 nov.'),('Dim. 22 nov. · Goodie','Ven. 20 nov. · Goodie'),('17, 18, 19 et 22 novembre','17, 18, 19 et 20 novembre'),
# es
('extras gratis · 17–22 nov','extras gratis · 17–20 nov'),('17–22 DE NOVIEMBRE','17–20 DE NOVIEMBRE'),('jueves 19 y domingo 22 de noviembre','jueves 19 y viernes 20 de noviembre'),('<div class="pl-when">Dom<br/><b>22 nov</b></div>','<div class="pl-when">Vie<br/><b>20 nov</b></div>'),('10–19 nov y 22 nov.','10–20 nov.'),('dom 22 nov · Regalito','vie 20 nov · Regalito'),('17, 18, 19 y 22 de noviembre','17, 18, 19 y 20 de noviembre'),
# pt
('extras gratuitos · 17–22 de nov.','extras gratuitos · 17–20 de nov.'),('17–22 DE NOVEMBRO','17–20 DE NOVEMBRO'),('quinta-feira, 19 e domingo, 22 de novembro','quinta-feira, 19 e sexta-feira, 20 de novembro'),('<div class="pl-when">Dom.<br/><b>22 nov.</b></div>','<div class="pl-when">Sex.<br/><b>20 nov.</b></div>'),('10–19 nov. e 22 nov.','10–20 nov.'),('Dom 22 nov · Brinde','Sex 20 nov · Brinde'),('17, 18, 19 e 22 de novembro','17, 18, 19 e 20 de novembro'),
# ar
('17–22 نوفمبر','17–20 نوفمبر'),('والخميس 19 والأحد 22 نوفمبر','والخميس 19 والجمعة 20 نوفمبر'),('<div class="pl-when">الأحد<br/><b>22 نوفمبر</b></div>','<div class="pl-when">الجمعة<br/><b>20 نوفمبر</b></div>'),('10–19 نوفمبر و22 نوفمبر.','10–20 نوفمبر.'),('الأحد 22 نوفمبر · هدية','الجمعة 20 نوفمبر · هدية'),('17 و18 و19 و22 نوفمبر','17 و18 و19 و20 نوفمبر'),
# he
('17–22 בנובמבר','17–20 בנובמבר'),('ויום ראשון, 22 בנובמבר','ויום שישי, 20 בנובמבר'),('<div class="pl-when">א׳<br/><b>22 בנובמבר</b></div>','<div class="pl-when">ו׳<br/><b>20 בנובמבר</b></div>'),('10–19 בנובמבר ו-22 בנובמבר.','10–20 בנובמבר.'),('יום א׳, 22 בנובמבר · פינוק','יום ו׳, 20 בנובמבר · פינוק'),('17, 18, 19 ו-22 בנובמבר','17, 18, 19 ו-20 בנובמבר'),
# hi
('17–22 नवंबर','17–20 नवंबर'),('गुरुवार 19 और रविवार 22 नवंबर','गुरुवार 19 और शुक्रवार 20 नवंबर'),('<div class="pl-when">रवि<br/><b>22 नवंबर</b></div>','<div class="pl-when">शुक्र<br/><b>20 नवंबर</b></div>'),('10–19 नवंबर और 22 नवंबर।','10–20 नवंबर।'),('रवि 22 नवंबर · तोहफ़ा','शुक्र 20 नवंबर · तोहफ़ा'),('17, 18, 19 और 22 नवंबर','17, 18, 19 और 20 नवंबर'),
# bn
('১৭–২২ নভেম্বর','১৭–২০ নভেম্বর'),('বৃহস্পতিবার ১৯ ও রবিবার ২২ নভেম্বর','বৃহস্পতিবার ১৯ ও শুক্রবার ২০ নভেম্বর'),('<div class="pl-when">রবি<br/><b>২২ নভেম্বর</b></div>','<div class="pl-when">শুক্র<br/><b>২০ নভেম্বর</b></div>'),('১০–১৯ নভেম্বর ও ২২ নভেম্বর।','১০–২০ নভেম্বর।'),('রবি ২২ নভেম্বর · গুডি','শুক্র ২০ নভেম্বর · গুডি'),('১৭, ১৮, ১৯ ও ২২ নভেম্বর','১৭, ১৮, ১৯ ও ২০ নভেম্বর'),
# id
('ekstra gratis · 17–22 Nov','ekstra gratis · 17–20 Nov'),('Kamis 19, dan Minggu 22 November','Kamis 19, dan Jumat 20 November'),('<div class="pl-when">Min<br/><b>22 Nov</b></div>','<div class="pl-when">Jum<br/><b>20 Nov</b></div>'),('10–19 Nov dan 22 Nov.','10–20 Nov.'),('Min 22 Nov · Bonus','Jum 20 Nov · Bonus'),('17, 18, 19, dan 22 November','17, 18, 19, dan 20 November'),
# zh
('11月17–22日','11月17–20日'),('19日周四和22日周日','19日周四和20日周五'),('<div class="pl-when">周日<br/><b>11月22日</b></div>','<div class="pl-when">周五<br/><b>11月20日</b></div>'),('11月10–19日和11月22日。','11月10–20日。'),('11月22日（周日）· 小福利','11月20日（周五）· 小福利'),('11月17日、18日、19日和22日','11月17日、18日、19日和20日'),
]
# English pl-note "Eleven ... 10–20 Nov." fine. Apply.
for L in ['','fr/','es/','pt/','ar/','he/','hi/','bn/','id/','zh/']:
    f=L+'index.html';s=open(f).read();hits={}
    for a,b in R:
        n=s.count(a)
        if n: hits[a[:30]]=n; s=s.replace(a,b)
    if '--write' in sys.argv: open(f,'w').write(s)
    body='\n'.join(l for l in s.split('\n') if len(l)<100000)
    left=[m.group(0) for m in re.finditer(r'.{0,40}(22|২২)(?![0-9px%]).{0,30}',body) if not re.search(r'rgba|nth-child|inset|width|height|gap|font|padding|margin|r-lg|#|svg|path|viewbox|\.22|M1|d="',m.group(0),re.I)]
    print(f,sum(hits.values()),'left:',left[:6])
