import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fontBytes from './assets/billing-font.ttf';
import logoBytes from './assets/autoentrepreneur-1.png';

const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
function small(n){
  if(n<17)return units[n];
  if(n<20)return 'dix-'+units[n-10];
  if(n<70){const ten=['','','vingt','trente','quarante','cinquante','soixante'][Math.floor(n/10)],rest=n%10;return ten+(rest===1?' et un':rest?'-'+small(rest):'');}
  if(n<80)return 'soixante'+(n===71?' et onze':'-'+small(n-60));
  return 'quatre-vingt'+(n===80?'s':'-'+small(n-80));
}
function integer(n){if(n<100)return small(n);if(n<1000){const h=Math.floor(n/100),rest=n%100;return(h===1?'cent':units[h]+' cent'+(!rest?'s':''))+(rest?' '+small(rest):'');}if(n<1000000){const k=Math.floor(n/1000),rest=n%1000;return(k===1?'mille':integer(k)+' mille')+(rest?' '+integer(rest):'');}const m=Math.floor(n/1000000),rest=n%1000000;return integer(m)+' million'+(m>1?'s':'')+(rest?' '+integer(rest):'');}
export const moneyWords = cents => (integer(Math.floor(cents/100))||'zéro')+' dirhams'+(cents%100?' et '+integer(cents%100)+' centimes':'');
const money = cents => (cents/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\s/g,' ')+' DH';

export async function renderBillingPdf(invoice, issuer, client, official=false){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(fontBytes,{subset:true}),page=pdf.addPage([612,792]),logo=await pdf.embedPng(logoBytes);
  const timestamp=new Date((official?invoice.approved_at:invoice.submitted_at||invoice.created_at).replace(' ','T')+'Z');
  pdf.setTitle(official?'Facture '+invoice.reference:'Prévisualisation de facture');pdf.setAuthor('Workcrute');pdf.setCreationDate(timestamp);pdf.setModificationDate(timestamp);
  const text=(value,x,y,size=9,maxWidth=460)=>{value=String(value||'');while(size>6.5&&font.widthOfTextAtSize(value,size)>maxWidth)size-=.25;page.drawText(value,{x,y,size,font,color:rgb(0,0,0),maxWidth,lineHeight:size+2});};
  const box=(x,y,w,h,fill)=>page.drawRectangle({x,y,width:w,height:h,borderWidth:.4,borderColor:rgb(.68,.68,.68),...(fill?{color:fill}:{})});
  page.drawImage(logo,{x:239,y:646,width:103,height:101});
  const date=timestamp.toLocaleDateString('fr-FR',{timeZone:'Africa/Casablanca'});
  text('Date : '+date,432,619,9.5,100);
  box(203,590,205,17,rgb(.91,.91,.91));
  const period=new Date(invoice.period+'-15T12:00:00Z').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  text((official?'Facture numéro '+invoice.reference:'Prévisualisation - V'+invoice.version)+' - '+period,216,595,10,188);
  text('Client :',92,560,9);text(client.client_name,152,560,9,365);
  text('Adresse :',92,547,9);text(client.client_address,152,547,9,365);
  const x=87,top=480,widths=[145,92,92,98],rowH=13,columns=[87,232,324,416,514];
  box(x,top,427,rowH,rgb(.64,.64,.64));
  ['Désignation','Quantité','Prix unitaire','Total'].forEach((label,i)=>page.drawText(label,{x:columns[i]+(widths[i]-font.widthOfTextAtSize(label,9))/2,y:top+4,size:9,font,color:rgb(1,1,1)}));
  const details=JSON.parse(invoice.details_json||'{}');
  const lines=[['Prestation autoentrepreneur',invoice.service_centimes,'service'],['Frais',invoice.expenses_centimes,'expenses'],['Prime',invoice.bonus_centimes,'bonus'],['Autre',invoice.other_centimes,'other']].filter(([,amount])=>amount>0);
  for(let r=0;r<14;r++){const y=top-(r+1)*rowH;for(let c=0;c<4;c++)box(columns[c],y,widths[c],rowH);const item=lines[r];if(item){text(item[0]+(details[item[2]]?' : '+details[item[2]]:''),x+5,y+3,9,135);text('1',columns[1]+43,y+3,9,30);text(money(item[1]),columns[2]+5,y+3,9,82);text(money(item[1]),columns[3]+5,y+3,9,88);}}
  box(115,247,399,26);text('Montant en Dirhams',120,264,9,185);text(client.tax_mention||'',120,252,8,180);text('Total Net à payer',309,264,9,88);text(money(invoice.total_centimes),401,264,9,105);
  text('ARRÊTÉ LA PRÉSENTE FACTURE À LA SOMME DE :',97,212,9);text('# '+moneyWords(invoice.total_centimes).toUpperCase()+' #',97,199,9,420);
  text('Signature : '+(issuer.signature||issuer.legal_name),457,145,9,100);
  if(client.tax_mention)text(client.tax_mention,92,103,6.8,422);
  page.drawLine({start:{x:92,y:93},end:{x:516,y:93},thickness:.5,dashArray:[3,2]});
  text('Autoentrepreneur : '+issuer.legal_name,104,71,8.5,240);text('CNIF : '+issuer.cnif,335,71,8.5,175);
  text('Adresse : '+issuer.address,104,58,8.5,408);
  text('ICE : '+issuer.ice,104,45,8.5,408);
  text('IF : '+issuer.fiscal_id,104,32,8.5,133);text('Taxe professionnelle N° : '+issuer.professional_tax,239,32,8.5,272);
  text('TEL : '+issuer.phone,104,19,8.5,150);text('Mail : '+issuer.email,266,19,8.5,246);
  if(!official)text('DOCUMENT PROVISOIRE - EN ATTENTE DE VALIDATION',154,8,6.5,330);
  return pdf.save();
}
