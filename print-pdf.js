/* Geração local de PDF: as mesmas medidas do montador, JPEGs sem recompressão. */
(() => {
  "use strict";
  async function create({questions, settings, isKey, loadImage}) {
    const {PDFDocument, StandardFonts, rgb} = window.PDFLib;
    const pdf = await PDFDocument.create();
    const normal = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const model = window.SENAI_PRINT, format = model.layout(settings);
    const mm = value => value * 72/25.4;
    const safe = value => Array.from(String(value)).map(char => {
      try { normal.encodeText(char);return char; } catch { return "?"; }
    }).join("");
    const title = `${isKey ? "Gabarito · " : ""}${settings.title || "Lista de exercícios"}`;
    pdf.setTitle(title);pdf.setCreator("Caderno SENAI · Montar prova");pdf.setLanguage("pt-BR");
    function text(page,value,x,top,size=10,font=normal) {
      page.drawText(safe(value),{x:mm(x),y:mm(format.pageHeight-top)-size,size,font,color:rgb(0,0,0)});
    }
    function line(page,top,x=format.margin,width=format.width) {
      page.drawLine({start:{x:mm(x),y:mm(format.pageHeight-top)},end:{x:mm(x+width),y:mm(format.pageHeight-top)},thickness:.3,color:rgb(.6,.6,.6)});
    }
    function questionBadge(page, index, x, top, width=26) {
      const label = `${index} / ${questions.length}`, height = 5;
      page.drawRectangle({x:mm(x),y:mm(format.pageHeight-top-height),width:mm(width),height:mm(height),
        color:rgb(1,224/255,130/255),borderColor:rgb(166/255,124/255,0),borderWidth:mm(.25)});
      const size = Math.min(width<26?8:10, mm(width-2)/bold.widthOfTextAtSize(label,1));
      page.drawText(label,{x:mm(x+width/2)-bold.widthOfTextAtSize(label,size)/2,
        y:mm(format.pageHeight-top-height/2)-bold.heightAtSize(size,{descender:false})/2,
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
      const page=pdf.addPage([mm(format.pageWidth),mm(format.pageHeight)]);
      if (model.headerHeight(format,index===0)) {
        fit(title,format.width,13,bold).slice(0,2).forEach((value,i)=>text(page,value,format.margin,format.margin+i*5.5,13,bold));
      }
      if (index===0 && format.showHeader) {
        if (!isKey)text(page,"Nome: ______________________________________________________________",format.margin,format.margin+15,10);
        text(page,`Turma: ${settings.className || "________________"}     Data: ${settings.date || "____/____/________"}`,format.margin,format.margin+22,9);
        fit(isKey ? "O badge amarelo identifica a questão no caderno: número / total de questões." :
          "Use o número do badge amarelo (questão / total). Os números nas imagens são das provas originais.",format.width,8)
          .slice(0,2).forEach((value,i)=>text(page,value,format.margin,format.margin+30+i*3.5,8));
      }
      const pageNumber=`${index+1} / ${count}`;
      text(page,pageNumber,format.pageWidth-format.margin-normal.widthOfTextAtSize(pageNumber,8)/mm(1),format.footerTop,8);
      return page;
    }
    if (isKey) {
      const pages=model.keyPages(questions,settings), count=pages.length;
      for (let pn=0;pn<count;pn++) {
        const page=sheet(pn,count);let top=format.margin+model.headerHeight(format,pn===0);
        const columns=format.keyColumnWidths.map((width,i)=>format.margin+format.keyColumnWidths.slice(0,i).reduce((sum,w)=>sum+w,0));
        ["Questão","Origem","Disciplina","Resposta"].forEach((value,i)=>text(page,value,columns[i]+2,top+1,10,bold));
        line(page,top+7);top+=7;
        pages[pn].questions.forEach((q,i)=>{
          questionBadge(page,pages[pn].start+i+1,columns[0]+2,top+1);
          [`CGE ${q.cge} · ${q.numero}`,q.disciplina,window.SENAI_PRINT.answer(q)]
            .forEach((value,col)=>text(page,value,columns[col+1]+2,top+1,9,col===2?bold:normal));
          line(page,top+7);top+=7;
        });
      }
    } else {
      const pages=model.pack(questions,settings), embedded=new Map();
      for (let index=0;index<pages.length;index++) {
        const page=sheet(index,pages.length);
        for (const row of pages[index].rows) {
          const x=format.margin+row.x, top=format.margin+row.y, inset=format.questionBorder?1.5:0;
          line(page,top,x,row.columnWidth);
          const lines=model.caption(row), size=lines.length>1?7:9;
          lines.forEach((label,i)=>text(page,label,x+inset,top+1.5+i*3.5,size,bold));
          questionBadge(page,row.index,x+row.columnWidth-row.badgeWidth-inset,top+1,row.badgeWidth);
          for (const item of row.items) {
            if (!embedded.has(item.crop.arquivo)) embedded.set(item.crop.arquivo,await pdf.embedJpg(await loadImage(item.crop.arquivo)));
            page.drawImage(embedded.get(item.crop.arquivo),{x:mm(format.margin+item.x+(item.columnWidth-item.width)/2),
              y:mm(format.pageHeight-top-item.labelHeight-item.height),width:mm(item.width),height:mm(item.height)});
          }
        }
        if (format.questionBorder) for (const frame of model.questionFrames(pages[index])) {
          page.drawRectangle({x:mm(format.margin+frame.x), y:mm(format.pageHeight-format.margin-frame.y-frame.height),
            width:mm(frame.width), height:mm(frame.height), borderWidth:mm(.3), borderColor:rgb(.4,.4,.4)});
        }
      }
    }
    return pdf.save();
  }
  window.SENAI_PDF={create};
})();
