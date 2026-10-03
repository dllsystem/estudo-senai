/* Exploração offline da classificação. Não faz chamadas ao modelo. */
(() => {
  'use strict';
  const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const add=(p,...cs)=>{cs.flat().filter(Boolean).forEach(c=>p.append(c));return p;};
  const plain=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const pct=n=>n==null?'—':new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:1}).format(n);
  const label={quase_igual:'Quase igual',mesmo_metodo:'Mesmo método',mesma_habilidade:'Mesma habilidade',mesmo_assunto_apenas:'Só o assunto',sem_relacao:'Sem relação',incerto:'Informação insuficiente'};
  const state={tab:'explore',search:'',subject:'',topic:'',sub:'',skill:'',method:'',context:'',extra:'',review:'',page:1,pairStatus:'different'};
  function button(text,fn,cls='button button-secondary'){const b=E('button',cls,text);b.type='button';b.onclick=fn;return b;}
  function render(root,{questions,renderQuestion}) {
    root.replaceChildren();root.classList.add('classification-root');
    const data=window.SENAI_CLASSIFICATION_DATA;
    if(!data){add(root,E('p','','O arquivo de classificação não foi encontrado.'));return;}
    const byId=new Map(questions.map(q=>[q.id,q]));
    const full=!!data.acervo, total=data.questoes.length, fmt=n=>new Intl.NumberFormat('pt-BR').format(n);
    const topics=new Map(data.taxonomia.assuntos.map(t=>['t'+t.id,t]));
    const subs=new Map(data.taxonomia.subassuntos.map(t=>[String(t.id),t]));
    const topicName=k=>topics.get(k)?.nome||({outro:'Fora do programa listado',insuficiente:'Informação insuficiente'}[k]||k);
    const subName=k=>{const s=subs.get(k);if(!s)return k;const repeated=[...subs.values()].filter(x=>x.nome===s.nome).length>1;return s.nome+(repeated?' — '+topicName('t'+s.assunto_id):'');};
    const body=E('section','classification-body');
    const intro=add(E('section','page-intro classification-intro'),E('p','eyebrow',full?'Classificação do acervo':'Piloto de classificação'),E('h1','','Encontre o que a questão exige.'),
      E('p','intro-copy',full?`${fmt(total)} questões analisadas. Cruze conteúdo do programa, habilidade e método. As classificações são sugestões automáticas e podem precisar de revisão.`:`${total} questões analisadas neste piloto. Cruze conteúdo do programa, habilidade e método.`));
    const tabs=E('div','classification-tabs');
    [['explore','Explorar questões'],['program','Programa da prova'],['results',full?'Dados e avaliação':'Resultados do piloto']].forEach(([id,name])=>{
      const b=button(name,()=>{state.tab=id;render(root,{questions,renderQuestion});});b.setAttribute('aria-pressed',String(state.tab===id));add(tabs,b);
    });
    add(root,intro,tabs,body);
    const original=(q,labelText='Ver questão e imagens originais')=>{
      const d=add(E('details','classification-original'),E('summary','',labelText));
      d.addEventListener('toggle',()=>{if(d.open&&!d.dataset.loaded){d.dataset.loaded='1';add(d,renderQuestion(q));}});return d;
    };
    const chip=(text)=>E('span','classification-chip',text);
    function tags(card,title,values){if(!values.length)return;add(card,add(E('div','classification-tags'),E('strong','',title),values.map(chip)));}
    if(state.tab==='explore') {
      const layout=E('div','workspace');const aside=E('aside','panel filter-panel');const results=E('section','result-area');
      add(aside,E('h2','','Cruzar filtros'));
      const controls={};
      function field(key,title,options){const wrap=E('div','filter-group');const l=E('label','',title),s=E('select','field');s.id='classification-'+key;l.htmlFor=s.id;
        for(const [v,t] of [['','Todos'],...options]){const o=E('option','',t);o.value=v;s.add(o);}s.value=state[key];
        s.onchange=()=>{state[key]=s.value;state.page=1;if(key==='subject'||key==='topic'){state.sub='';controls.sub.value='';}if(key==='subject'){state.topic='';controls.topic.value='';}refreshOptions();update();};
        add(aside,add(wrap,l,s));controls[key]=s;return s;}
      const l=E('label','','Buscar nas questões');l.htmlFor='classification-search';const search=E('input','field');search.id=l.htmlFor;search.type='search';search.placeholder='Ex.: porcentagem, água, floresta';search.value=state.search;
      search.oninput=()=>{state.search=search.value;state.page=1;update();};add(aside,add(E('div','filter-group'),l,search));
      field('subject','Disciplina',[...new Set(data.questoes.map(q=>q.disciplina))].map(x=>[x,x]));
      field('topic','Tema do programa',[...topics].map(([id,t])=>[id,t.nome]));
      field('sub','Subtema do programa',[...subs].map(([id,t])=>[id,subName(id)]));
      const values=k=>Object.entries(data.vocabulario[k]).map(([id,text])=>[id,text]);
      field('skill','Habilidade cobrada',values('habilidade'));field('method','Método de resolução',values('metodo'));field('context','Contexto da história',values('contexto'));field('extra','Conteúdo complementar',values('extra'));
      field('review','Conferência',[['review','Precisa de revisão'],['source','Conferir fonte original'],['different','Diverge da referência de tema'],['outside','Fora do programa listado']]);
      add(aside,E('p','field-help','Os filtros se combinam. Contexto é o cenário; tema e método indicam o conhecimento cobrado.'),button('Limpar filtros',()=>{for(const key of ['search','subject','topic','sub','skill','method','context','extra','review'])state[key]='';state.page=1;render(root,{questions,renderQuestion});},'button-text'));
      function refreshOptions(){for(const o of controls.topic.options){o.hidden=!!o.value&&!!state.subject&&topics.get(o.value)?.disciplina!==state.subject;}
        for(const o of controls.sub.options){const t=subs.get(o.value);o.hidden=!!o.value&&((!!state.topic&&'t'+t.assunto_id!==state.topic)||(!!state.subject&&topics.get('t'+t.assunto_id)?.disciplina!==state.subject));}}
      function update(){results.replaceChildren();const needle=plain(state.search);
        const filtered=data.questoes.filter(r=>{const q=byId.get(r.id);return q&&(!state.subject||r.disciplina===state.subject)&&(!state.topic||r.assuntos.includes(state.topic)||r.principal===state.topic)&&(!state.sub||r.subassuntos.includes(state.sub))&&(!state.skill||r.habilidades.includes(state.skill))&&(!state.method||r.metodo===state.method)&&(!state.context||r.contexto===state.context)&&(!state.extra||r.extras.includes(state.extra))&&(!needle||plain(q.id+' '+q.enunciado+' '+q.contexto+' '+Object.values(q.alternativas).join(' ')).includes(needle))&&(!state.review||(state.review==='review'&&r.revisar)||(state.review==='source'&&r.precisa_fonte)||(state.review==='different'&&r.concorda_referencia===false)||(state.review==='outside'&&r.principal==='outro'));});
        const pages=Math.max(1,Math.ceil(filtered.length/12));state.page=Math.min(state.page,pages);
        add(results,add(E('div','results-heading'),E('h2','','Questões classificadas'),E('span','result-count',`${fmt(filtered.length)} de ${fmt(total)} questões`)));
        if(!filtered.length)add(results,add(E('div','panel empty'),E('h3','','Nenhuma questão nesta combinação'),E('p','','Remova algum filtro para ampliar os resultados. Ausência de etiqueta não prova ausência de um conteúdo.')));
        for(const r of filtered.slice((state.page-1)*12,state.page*12)){const q=byId.get(r.id);const c=E('article','panel classification-card');c.dataset.classificationId=r.id;
          add(c,add(E('div','classification-card-head'),E('strong','question-id',`CGE ${q.cge} · Questão ${q.numero}`),chip(q.disciplina),r.revisar?chip('Conferir classificação'):null),
            E('h3','',topicName(r.principal)),E('p','classification-excerpt',q.enunciado.replace(/\s+/g,' ').slice(0,340)+(q.enunciado.length>340?'…':'')));
          tags(c,'Temas:',r.assuntos.map(topicName));tags(c,'Subtemas:',r.subassuntos.map(subName));tags(c,'Habilidades:',r.habilidades.map(k=>data.vocabulario.habilidade[k]));
          tags(c,'Método:',[data.vocabulario.metodo[r.metodo]]);tags(c,'Contexto:',[data.vocabulario.contexto[r.contexto]]);tags(c,'Complementos:',r.extras.map(k=>data.vocabulario.extra[k]));
          if(r.precisa_fonte)add(c,E('p','classification-note','O modelo sinalizou informação ausente na transcrição. Confira a imagem original.'));
          const audit=add(E('details','classification-audit'),E('summary','','Comparar classificação e referência'));
          add(audit,E('p','',`Classificação anterior por palavras-chave: ${r.temas_atuais.map(topicName).join(' · ')||'sem tema'}.`),E('p','',r.referencia?`Referência revisada pelo Codex no piloto: ${topicName(r.referencia.principal)}. ${r.referencia.justificativa}`:'Esta questão ainda não possui classificação de referência revisada individualmente.'),E('p','field-help',`Pontuação do modelo para o tema: ${pct(r.score_principal)}. Isso não representa uma taxa de acerto. Subtemas e facetas são sugestões experimentais; ausência de etiqueta não prova ausência do conteúdo.`));
          if(r.motivos_revisao?.length)add(audit,E('p','classification-note',r.motivos_revisao.join(' · ')));
          add(c,audit,original(q));add(results,c);
        }
        if(pages>1){const prev=button('← Anterior',()=>{state.page--;update();results.scrollIntoView();}),next=button('Próxima →',()=>{state.page++;update();results.scrollIntoView();});prev.disabled=state.page===1;next.disabled=state.page===pages;add(results,add(E('div','pagination'),prev,E('span','',`Página ${state.page} de ${pages}`),next));}}
      refreshOptions();add(body,add(layout,aside,results));update();
    } else if(state.tab==='program') {
      add(body,E('h2','','O programa que orienta os filtros'),E('p','',`24 temas e 107 subtemas do PDF enviado. As contagens refletem sugestões de classificação em ${fmt(total)} questões${full?' do acervo':' do piloto'}. Uma questão pode receber mais de um tema.`));
      const pdf=E('a','button button-secondary','Abrir programa em PDF');pdf.href=data.programa.arquivo;pdf.target='_blank';pdf.rel='noopener';add(body,pdf);
      for(const subject of [...new Set([...topics.values()].map(t=>t.disciplina))]){add(body,E('h3','classification-subject',subject));
        for(const [id,t] of topics){if(t.disciplina!==subject)continue;const n=data.questoes.filter(r=>r.principal===id||r.assuntos.includes(id)).length;
          const box=add(E('details','panel classification-program'),E('summary','',`${t.numero_programa}. ${t.nome} · ${fmt(n)} questões`));
          add(box,button('Explorar este tema',()=>{Object.assign(state,{tab:'explore',topic:id,subject,sub:'',skill:'',method:'',context:'',extra:'',review:'',search:'',page:1});render(root,{questions,renderQuestion});},'button-text'));
          const list=E('ul','');for(const [sid,s] of subs){if(s.assunto_id!==t.id)continue;const count=data.questoes.filter(r=>r.subassuntos.includes(sid)).length;add(list,E('li','',`${s.nome} — ${fmt(count)} sugestões`));}add(box,list);add(body,box);}}
      add(body,E('p','field-help','Conteúdos complementares são etiquetas separadas: não foram acrescentados ao programa oficial. Um subtema não avaliado pelo modelo não conta como negativo.'));
    } else {
      if(full){const a=data.acervo;const overview=E('div','stats');[[fmt(a.questoes),'questões analisadas'],[fmt(a.com_subtema),'com subtema sugerido'],[fmt(a.revisar),'sinalizadas para conferência'],[`US$ ${a.custo_usd.toFixed(4)}`,'custo da classificação do acervo']].forEach(([n,l])=>add(overview,add(E('div','stat'),E('strong','',n),E('span','',l))));add(body,overview);
        const info=add(E('div','panel classification-card'),E('h2','','Classificações salvas no banco principal'),E('p','',`${fmt(a.com_tema)} questões com tema do programa; ${fmt(a.fora_programa)} com tema principal fora da lista; ${fmt(a.insuficiente)} sem informação suficiente para definir o tema principal. Essas contagens não medem a qualidade da classificação.`),E('p','',a.aviso),E('p','field-help',`Versão ${a.versao}. As métricas do piloto abaixo se referem à versão anterior das instruções e não comprovam a qualidade do acervo inteiro.`));
        const dl=E('a','button button-secondary','Baixar SQLite completo');dl.href='questoes_senai.sqlite3';dl.download='questoes_senai.sqlite3';add(info,dl);add(body,info,E('h2','','Avaliação do piloto anterior'));}
      const s=data.resumo;const stats=E('div','stats');[[`${s.temas_principal_exato}/${s.questoes_piloto}`,'temas principais iguais à referência'],[`${s.pares_concordancia_exata}/${s.pares_piloto}`,'pares com a mesma classe da referência'],[`${s.latencia_mediana_s.toFixed(2)} s`,'tempo mediano por chamada'],[`US$ ${s.custo_usd.toFixed(4)}`,'custo informado pela API']].forEach(([n,l])=>add(stats,add(E('div','stat'),E('strong','',n),E('span','',l))));add(body,stats);
      add(body,add(E('div','panel classification-card'),E('h2','','Temas promissores; agrupamentos ainda exigem revisão'),E('p','',s.aviso),E('p','',`Foram analisadas 60 questões, 120 pares e uma etapa adicional de subtemas e habilidades para as mesmas 60 questões. A avaliação de qualidade se limita a essa amostra; os agrupamentos de similaridade continuam preservados.`)));
      const table=E('table','classification-table');const header=E('tr','');['Etiquetas de temas','Precisão da amostra','Cobertura da amostra'].forEach(t=>add(header,E('th','',t)));add(table,add(E('thead',''),header));const tb=E('tbody','');for(const [k,name] of [['atual','Palavras-chave anteriores'],['jev','Jev (limiar 0,50)']]){const m=s.etiquetas_multiplas[k];add(tb,add(E('tr',''),E('td','',name),E('td','',pct(m.precisao)),E('td','',pct(m.cobertura))));}add(table,tb);add(body,add(E('div','classification-table-wrap'),table));
      const test=s.pares_por_split.avaliacao;add(body,E('p','classification-note',`Nos ${test.n} pares reservados para avaliação, o critério forte de 0,90 não aceitou nenhum par. Com 0,50, ${test.criterios[0].tp} dos ${test.criterios[0].aceitos} aceitos concordaram com a referência de relação forte. Esses resultados ainda não sustentam agrupamento automático.`));
      add(body,E('h2','','Confira as comparações'));const switcher=E('div','classification-tabs');for(const [id,text] of [['different','Divergências'],['same','Concordâncias'],['all','Todos os pares']]){const b=button(text,()=>{state.pairStatus=id;render(root,{questions,renderQuestion});});b.setAttribute('aria-pressed',String(state.pairStatus===id));add(switcher,b);}add(body,switcher);
      for(const r of data.pares.filter(r=>state.pairStatus==='all'||(state.pairStatus==='same')===r.concorda)){
        const c=add(E('details','panel classification-pair'),E('summary','',`${r.a} ↔ ${r.b} · Jev: ${label[r.jev]} · referência: ${label[r.referencia]}`));
        add(c,E('p','',`Referência Codex: ${r.justificativa_referencia}`),E('p','field-help',`${r.split==='avaliacao'?'Avaliação':'Desenvolvimento'} · Soma das probabilidades de quase igual/mesmo método: ${pct(r.score_forte)}.`));
        const grid=E('div','classification-pair-grid');for(const id of [r.a,r.b]){const q=byId.get(id);if(q)add(grid,add(E('div',''),E('h3','',id),E('p','classification-excerpt',q.enunciado),original(q)));}add(c,grid);add(body,c);}
    }
  }
  window.SENAI_CLASSIFICATION={render};
})();
