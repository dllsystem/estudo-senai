/* Geração local de PDF: as mesmas medidas do montador, JPEGs sem recompressão. */
(() => {
  "use strict";
  async function create({questions, settings, isKey, loadImage}) {
    const {PDFDocument, StandardFonts, rgb} = window.PDFLib;
    const pdf = await PDFDocument.create();
    const normal = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mm = value => value * 72/25.4;
    const safe = value => Array.from(String(value)).map(char => {
      try { normal.encodeText(char);return char; } catch { return "?"; }
    }).join("");
    const title = `${isKey ? "Gabarito · " : ""}${settings.title || "Lista de exercícios"}`;
    pdf.setTitle(title);pdf.setCreator("Caderno SENAI · Montar prova");pdf.setLanguage("pt-BR");
    function text(page,value,x,top,size=10,font=normal) {
      page.drawText(safe(value),{x:mm(x),y:mm(297-top)-size,size,font,color:rgb(0,0,0)});
    }
    function line(page,top) {
      page.drawLine({start:{x:mm(12),y:mm(297-top)},end:{x:mm(198),y:mm(297-top)},thickness:.3,color:rgb(.6,.6,.6)});
    }
    function questionBadge(page, index, x, top) {
      const label = `${index} / ${questions.length}`, width = 26, height = 5;
      page.drawRectangle({x:mm(x),y:mm(297-top-height),width:mm(width),height:mm(height),
        color:rgb(1,224/255,130/255),borderColor:rgb(166/255,124/255,0),borderWidth:mm(.25)});
      const size = 10;
      page.drawText(label,{x:mm(x+width/2)-bold.widthOfTextAtSize(label,size)/2,
        y:mm(297-top-height/2)-bold.heightAtSize(size,{descender:false})/2,
        size,font:bold,color:rgb(51/255,38/255,0)});
    }
    function fit(value,width,size,font=normal) {
      const lines=[];let line="";
      for (const word of safe(value).split(/\s+/)) {
        const next=line ? line+" "+word : word;
        if (font.widthOfTextAtSize(next,size)>mm(width) && line) {lines.push(line);line=word;}
        else line=next;
      }
      if (line)lines.push(line);return lines;
    }
    function sheet(index,count) {
      const page=pdf.addPage([mm(210),mm(297)]);
      fit(title,186,13,bold).slice(0,2).forEach((value,i)=>text(page,value,12,12+i*5.5,13,bold));
      if (index===0) {
        if (!isKey)text(page,"Nome: ______________________________________________________________",12,27,10);
        text(page,`Turma: ${settings.className || "________________"}     Data: ${settings.date || "____/____/________"}`,12,34,9);
        text(page,isKey ? "O badge amarelo identifica a questão no caderno: número / total de questões." :
          "Use o número do badge amarelo (questão / total). Os números nas imagens são das provas originais.",12,42,8);
      }
      text(page,`${index+1} / ${count}`,188,288,8);
      return page;
    }
    if (isKey) {
      const count=Math.ceil(questions.length/32);
      for (let pn=0;pn<count;pn++) {
        const page=sheet(pn,count);let top=pn===0?52:26;
        const columns=[12,44,98,170];
        ["Questão","Origem","Disciplina","Resposta"].forEach((value,i)=>text(page,value,columns[i]+2,top+1,10,bold));
        line(page,top+7);top+=7;
        questions.slice(pn*32,pn*32+32).forEach((q,i)=>{
          questionBadge(page,pn*32+i+1,columns[0]+2,top+1);
          [`CGE ${q.cge} · ${q.numero}`,q.disciplina,window.SENAI_PRINT.answer(q)]
            .forEach((value,col)=>text(page,value,columns[col+1]+2,top+1,9,col===2?bold:normal));
          line(page,top+7);top+=7;
        });
      }
    } else {
      const pages=window.SENAI_PRINT.pack(questions), embedded=new Map();
      for (let index=0;index<pages.length;index++) {
        const page=sheet(index,pages.length);let top=index===0?52:26;
        for (const item of pages[index].items) {
          line(page,top);
          const label=`Questão ${item.index} · CGE ${item.cge} / original ${item.numero} · ${item.crop.tipo==="apoio"?"Apoio":"Questão"}${item.parts>1?` · parte ${item.part}/${item.parts}`:""}`;
          text(page,label,12,top+1.5,9,bold);
          questionBadge(page,item.index,198-26,top+1);
          if (!embedded.has(item.crop.arquivo)) embedded.set(item.crop.arquivo,await pdf.embedJpg(await loadImage(item.crop.arquivo)));
          page.drawImage(embedded.get(item.crop.arquivo),{x:mm(12+(186-item.width)/2),
            y:mm(297-top-7-item.height),width:mm(item.width),height:mm(item.height)});
          top+=item.total;
        }
      }
    }
    return pdf.save();
  }
  window.SENAI_PDF={create};
})();
