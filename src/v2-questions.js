const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bad=(message,status=422)=>json({userMessage:message},status);
const types=new Set(['text','textarea','number','checkbox']);
export async function applicationQuestions(env,all=false){const result=await env.DB.prepare(`SELECT id,label_fr,label_en,label_ar,type,position,required,active FROM v2_application_questions WHERE deleted=0 ${all?'':'AND active=1'} ORDER BY position,created_at,id`).all();return result.results||[];}
export async function validateApplicationAnswers(env,answers){
  const questions=await applicationQuestions(env);
  for(const question of questions){
    const value=answers[question.id];
    const missing=value===undefined||value===null||(typeof value==='string'&&!value.trim());
    if(question.required&&(missing||(question.type==='checkbox'&&value!==true)))return false;
    if(missing)continue;
    if(question.type==='checkbox'){if(typeof value!=='boolean')return false;}
    else if(question.type==='number'){if(!['number','string'].includes(typeof value)||!Number.isFinite(Number(value)))return false;}
    else if(typeof value!=='string'||value.length>4000)return false;
  }
  return true;
}
export async function questionsApi(request,env,path){
  const publicRoute=path==='/api/v2/questions';
  if(request.method==='GET')return json({items:await applicationQuestions(env,!publicRoute)});
  const id=path.startsWith('/api/admin/v2/questions/')?path.slice('/api/admin/v2/questions/'.length):null;
  if(request.method==='DELETE'&&id){const result=await env.DB.prepare('UPDATE v2_application_questions SET deleted=1,active=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted=0').bind(id).run();return result.meta?.changes?json({ok:true}):bad('Question introuvable.',404);}
  if(!['POST','PATCH'].includes(request.method)||publicRoute)return bad('Méthode invalide.',405);
  const current=id?await env.DB.prepare('SELECT * FROM v2_application_questions WHERE id=? AND deleted=0').bind(id).first():{};
  if(!current)return bad('Question introuvable.',404);
  const body={...current,...await request.json().catch(()=>({}))};
  const labels=['fr','en','ar'].map(language=>typeof body['label_'+language]==='string'?body['label_'+language].trim():'');
  const position=Number(body.position??0),required=Number(body.required??0),active=Number(body.active??1);
  if(labels.some(label=>!label||label.length>500)||!types.has(body.type)||!Number.isInteger(position)||position<0||position>1000||![0,1].includes(required)||![0,1].includes(active))return bad('Libellés FR/EN/AR et configuration valides obligatoires.');
  if(id)await env.DB.prepare('UPDATE v2_application_questions SET label_fr=?,label_en=?,label_ar=?,type=?,position=?,required=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...labels,body.type,position,required,active,id).run();
  else {body.id=crypto.randomUUID();await env.DB.prepare('INSERT INTO v2_application_questions(id,label_fr,label_en,label_ar,type,position,required,active) VALUES(?,?,?,?,?,?,?,?)').bind(body.id,...labels,body.type,position,required,active).run();}
  return json({id:id||body.id},id?200:201);
}
