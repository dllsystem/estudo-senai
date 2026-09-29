/* Acervo estático; preferências e seleção de impressão são salvas no navegador. */
(() => {
  "use strict";

  const data = window.SENAI_DATA;
  const root = document.getElementById("app");
  if (!data || !root) {
    if (root) root.textContent = "Não foi possível carregar data.js. Abra a pasta completa após descompactar o ZIP.";
    return;
  }

  const questions = data.questions;
  const similarity = data.similaridade || { resumo: {}, familias: [] };
  const topics = data.topics;
  const exams = new Map(data.exams.map(exam => [exam.cge, exam]));
  const topicById = new Map(topics.map(topic => [topic.id, topic]));
  const byId = new Map(questions.map(question => [question.id, question]));
  const printModel = window.SENAI_PRINT;
  const selectionKey = "senai-print-selection-v1";
  const presentationKey = "senai-library-presentation-v1";
  let savedPresentation = "text";
  try { if (window.localStorage.getItem(presentationKey) === "original") savedPresentation = "original"; }
  catch { /* A visualização continua funcionando sem armazenamento local. */ }
  let savedSelection, storageAvailable = true;
  try { savedSelection = JSON.parse(window.localStorage.getItem(selectionKey) || "null"); }
  catch { storageAvailable = false; }
  const subjects = ["Língua Portuguesa", "Matemática", "Ciências"];
  const choices = ["A", "B", "C", "D", "E"];
  const hasChoice = (q, letter) => Boolean(q.alternativas[letter] || q.alternativas_imagens?.[letter]);
  const eligible = questions.filter(q => q.gabarito === "válida" && q.extracao === "pronta" && q.resposta && choices.every(letter => hasChoice(q, letter)));
  const eligibleTopicCounts = new Map(topics.map(t => [t.id, eligible.filter(q => q.temas.includes(t.id)).length]));
  const state = {
    view: "library",
    libraryPresentation: savedPresentation,
    library: { search: "", subject: "", topic: "", exam: "", page: 1 },
    exams: { search: "", year: "", modality: "", semester: "" },
    study: { subject: "", topics: new Set(), count: 10 },
    similarity: { subject: "", search: "" },
    session: null,
    print: printModel.restore(savedSelection, byId),
    printOrganization: "subject-space",
    printFeedback: null,
  };

  const E = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined && content !== null) element.textContent = String(content);
    return element;
  };
  const add = (parent, ...children) => { children.flat().filter(Boolean).forEach(child => parent.appendChild(child)); return parent; };
  const fmt = number => new Intl.NumberFormat("pt-BR").format(number);
  const plain = text => (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function selectField(label, options, value, onChange) {
    const wrap = E("div", "filter-group");
    const labelNode = E("label", "", label);
    const select = E("select", "field");
    select.setAttribute("aria-label", label);
    options.forEach(([id, text]) => {
      const option = E("option", "", text);
      option.value = String(id);
      if (String(id) === String(value)) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    add(wrap, labelNode, select);
    return wrap;
  }

  function button(label, className, action) {
    const node = E("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function pill(label, variant = "neutral") { return E("span", `pill pill-${variant}`, label); }

  function downloadLink(document, label, className = "button button-secondary") {
    const link = E("a", `${className} pdf-download`, label);
    link.href = document.arquivo;
    link.download = document.nome;
    return link;
  }

  function openPageViewer(exam, firstPage = 1, heading = `CGE ${exam.cge} · Prova completa`) {
    let page = firstPage;
    const dialog = E("dialog", "page-dialog");
    dialog.setAttribute("aria-label", `Páginas da prova CGE ${exam.cge}`);
    const toolbar = E("div", "page-toolbar");
    const title = E("strong", "", heading);
    const count = E("span", "page-count");
    const controls = E("div", "page-controls");
    const previous = button("← Anterior", "button button-secondary", () => { page--; showPage(); });
    const next = button("Próxima →", "button button-secondary", () => { page++; showPage(); });
    const zoom = button("Ampliar", "button button-secondary", () => {
      imageArea.classList.toggle("is-zoomed", !imageArea.classList.contains("is-zoomed"));
      zoom.textContent = imageArea.classList.contains("is-zoomed") ? "Ajustar" : "Ampliar";
    });
    const download = downloadLink(exam.documentos[0], "Baixar PDF ↓", "button button-secondary");
    const close = button("Fechar ×", "button button-secondary", () => dialog.close());
    add(controls, previous, count, next, zoom, download, close);
    add(toolbar, title, controls);
    const imageArea = E("div", "page-preview");
    const image = E("img", "page-image");
    image.alt = `Página ${page} da prova CGE ${exam.cge}`;
    add(imageArea, image);
    add(dialog, toolbar, imageArea);
    function showPage() {
      page = Math.min(Math.max(page, 1), exam.paginas);
      image.src = `paginas/CGE${exam.cge}-p${page}.webp`;
      image.alt = `Página ${page} da prova CGE ${exam.cge}`;
      count.textContent = `${page} / ${exam.paginas}`;
      previous.disabled = page <= 1;
      next.disabled = page >= exam.paginas;
      imageArea.scrollTo({ top: 0, left: 0 });
    }
    dialog.addEventListener("close", () => dialog.remove());
    document.body.appendChild(dialog);
    showPage();
    dialog.showModal();
  }

  function pageButton(q) {
    return button("Ver página da prova", "button-text pdf-link", () =>
      openPageViewer(exams.get(q.cge), q.pagina || 1, `CGE ${q.cge} · Questão ${q.numero}`));
  }

  function examButton(cge, className = "button-text") {
    return button("Ver prova completa", `${className} full-exam-link`, () => openPageViewer(exams.get(cge)));
  }

  function questionSourceActions(q) {
    const actions = E("div", "question-source-actions");
    add(actions, pageButton(q), examButton(q.cge));
    return actions;
  }

  function questionImages(q) {
    const media = [...(q.imagens || [])];
    const missingChoices = !choices.every(letter => hasChoice(q, letter));
    if (missingChoices && q.pagina) {
      for (let page = q.pagina; page <= (q.pagina_fim || q.pagina); page++) {
        if (!media.some(item => item.pagina === page && item.tipo === "pagina_original")) {
          media.push({ pagina: page, arquivo: `paginas/CGE${q.cge}-p${page}.webp`, tipo: "pagina_original" });
        }
      }
    }
    if (!media.length) return null;
    const wrap = E("div", "inline-media");
    const isolated = media.length === 1 && media[0].tipo === "figura_extraida";
    add(wrap, E("span", "media-heading", missingChoices ? "Alternativas na página original" : isolated ? "Figura da questão" : media.length === 1 ? "Imagem da página original" : "Imagens das páginas originais"));
    media.forEach(media => {
      const frame = E("div", "inline-image-frame");
      const image = E("img", "inline-page-image");
      image.src = media.arquivo;
      image.loading = "lazy";
      image.alt = media.tipo === "figura_extraida" ? `Figura extraída da questão ${q.numero} da prova CGE ${q.cge}` : `Página ${media.pagina} da prova CGE ${q.cge}, com a figura ou tabela da questão`;
      add(frame, image);
      add(wrap, E("span", "media-caption", media.tipo === "figura_extraida" ? `CGE ${q.cge} · página ${media.pagina}` : `CGE ${q.cge} · página ${media.pagina} · role a imagem para ver a página inteira`), frame);
    });
    add(wrap, button("Ampliar página", "button-text", () => openPageViewer(exams.get(q.cge), q.pagina || 1)));
    return wrap;
  }

  function intro(eyebrow, heading, description) {
    const wrapper = E("div", "page-intro");
    const copy = E("div");
    add(copy, E("span", "eyebrow", eyebrow), E("h1", "", heading), E("p", "lede", description));
    add(wrapper, copy);
    return wrapper;
  }

  function questionMeta(q) {
    const meta = E("div", "question-meta");
    add(meta, E("span", "meta-number", `CGE ${q.cge} · Questão ${String(q.numero).padStart(2, "0")}`), pill(q.disciplina));
    if (q.gabarito === "anulada") add(meta, pill("Anulada", "warm"));
    if (q.extracao !== "pronta") add(meta, pill("Transcrição a revisar", "red"));
    if (q.visual) add(meta, pill("Imagem disponível abaixo", "warm"));
    return meta;
  }

  function context(q) {
    return q.contexto && q.contexto.trim() ? E("div", "question-context", q.contexto) : null;
  }

  function optionRows(q, selected, reveal) {
    const list = E("div", "options");
    for (const letter of choices) {
      if (!hasChoice(q, letter)) continue;
      const row = E("div", "option");
      if (reveal && letter === q.resposta && q.gabarito === "válida") row.classList.add("is-answer");
      if (reveal && selected === letter && letter !== q.resposta) row.classList.add("is-wrong");
      add(row, E("span", "option-letter", letter), choiceContent(q, letter));
      list.appendChild(row);
    }
    return list;
  }

  function choiceContent(q, letter) {
    const content = E("span", "option-content");
    if (q.alternativas[letter]) add(content, E("span", "", q.alternativas[letter]));
    if (q.alternativas_imagens?.[letter]) {
      const image = E("img", "option-image");
      image.src = q.alternativas_imagens[letter];
      image.loading = "lazy";
      image.alt = `Desenho da alternativa ${letter} da questão ${q.numero} da prova CGE ${q.cge}`;
      add(content, image);
    }
    return content;
  }

  function topicChips(q) {
    if (!q.temas.length) return null;
    const row = E("div", "topic-chips");
    row.setAttribute("aria-label", "Temas sugeridos automaticamente");
    q.temas.forEach(id => add(row, E("span", "topic-chip", topicById.get(id)?.nome || "")));
    return row;
  }

  function variantButton(q, hideAnswers = false) {
    const count = q.similares?.length || 0;
    if (!count) return null;
    return button(`${count} ${count === 1 ? "variante relacionada" : "variantes relacionadas"} ↗`,
      "button-text variant-link", () => openVariantDialog(q, hideAnswers));
  }

  function variantCard(q, hideAnswers, relationType) {
    const card = E("article", "variant-card");
    const meta = questionMeta(q);
    if (relationType === "quase_igual") add(meta, pill("Enunciado quase igual", "warm"));
    else if (relationType === "mesmo_metodo") add(meta, pill("Mesmo procedimento"));
    else if (relationType === "mesma_habilidade") add(meta, pill("Mesma habilidade"));
    add(card, meta, questionPresentation(q, null, !hideAnswers));
    if (!choices.every(letter => hasChoice(q, letter))) add(card, E("p", "note", "Confira as alternativas na imagem da página original."));
    const foot = E("div", "variant-card-foot");
    add(foot, hideAnswers ? E("span", "note", "Resposta oculta durante o estudo") :
      E("span", "answer-label", q.resposta ? `Resposta correta: ${q.resposta}` : "Resposta indisponível"), questionSourceActions(q));
    add(card, foot);
    return card;
  }

  function openVariantDialog(q, hideAnswers = false, family = null) {
    const links = family ? family.questoes.map(id => ({ id, tipo: family.tipo })) :
      (q.similares || []).slice().sort((a, b) =>
        ({ quase_igual: 0, mesmo_metodo: 1, mesma_habilidade: 2 }[a.tipo] ?? 3) -
        ({ quase_igual: 0, mesmo_metodo: 1, mesma_habilidade: 2 }[b.tipo] ?? 3));
    const dialog = E("dialog", "variant-dialog");
    dialog.setAttribute("aria-label", family ? `Família ${family.nome}` : `Variantes da questão ${q.id}`);
    const header = E("div", "variant-dialog-header");
    const title = E("div");
    add(title, E("span", "eyebrow", family ? "Família de questões" : `CGE ${q.cge} · Questão ${q.numero}`),
      E("h2", "", family ? family.nome : `${links.length} ${links.length === 1 ? "variante relacionada" : "variantes relacionadas"}`));
    add(header, title, button("Fechar ×", "button button-secondary", () => dialog.close()));
    const introText = E("p", "variant-intro", hideAnswers ?
      "Compare outras formas de cobrar esta habilidade. Os gabaritos ficam ocultos durante o simulado." :
      "Compare os enunciados e as alternativas. 'Enunciado quase igual' indica texto reaproveitado; 'mesmo procedimento' cobra resolução parecida; 'mesma habilidade' pode usar outro texto ou operação.");
    const list = E("div", "variant-list");
    links.forEach(link => { const item = byId.get(link.id); if (item) add(list, variantCard(item, hideAnswers, link.tipo)); });
    add(dialog, header, introText, list);
    dialog.addEventListener("close", () => dialog.remove());
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  function sourceFooter(q, selected) {
    const footer = E("div", "question-footer");
    const answerText = q.gabarito === "anulada" ? "Questão anulada" : q.resposta ? `Resposta correta: ${q.resposta}` : "Resposta indisponível";
    const answer = E("span", `answer-label${q.gabarito === "anulada" ? " annulled" : ""}`, answerText);
    if (selected !== undefined) answer.textContent = `Sua resposta: ${selected || "em branco"} · ${answerText}`;
    add(footer, answer, variantButton(q), questionSourceActions(q));
    return footer;
  }

  function libraryCard(q) {
    const card = E("article", "panel question-card");
    add(card, questionMeta(q), topicChips(q), questionPresentation(q, null, true, true, state.libraryPresentation === "original"));
    add(card, sourceFooter(q));
    return card;
  }

  function saveSelection() {
    try { window.localStorage.setItem(selectionKey, JSON.stringify(state.print)); }
    catch { storageAvailable = false; }
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.dataset.view === "print") link.textContent = `Montar prova${state.print.ids.length ? ` (${state.print.ids.length})` : ""}`;
    });
    document.querySelectorAll(".print-select").forEach(node => {
      const selected = state.print.ids.includes(node.dataset.questionId);
      node.textContent = selected ? "✓ Selecionada para impressão" : "+ Selecionar para impressão";
      node.setAttribute("aria-pressed", String(selected));
    });
  }

  function selectionButton(q) {
    const selected = state.print.ids.includes(q.id);
    const select = button(selected ? "✓ Selecionada para impressão" : "+ Selecionar para impressão", "button-text print-select", () => {
      state.printFeedback = null;
      if (state.print.ids.includes(q.id)) state.print.ids = state.print.ids.filter(id => id !== q.id);
      else state.print.ids.push(q.id);
      saveSelection();
      const nowSelected = state.print.ids.includes(q.id);
      select.textContent = nowSelected ? "✓ Selecionada para impressão" : "+ Selecionar para impressão";
      select.setAttribute("aria-pressed", String(nowSelected));
    });
    select.dataset.questionId = q.id;
    select.setAttribute("aria-pressed", String(selected));
    select.disabled = !q.recortes?.length;
    return select;
  }

  function originalImages(q) {
    const wrap = E("div", "original-images");
    if (!q.recortes?.length) {
      add(wrap, E("p", "note", "O recorte desta questão ainda não está disponível."), pageButton(q));
      return wrap;
    }
    q.recortes.forEach((crop, index) => {
      const figure = E("figure", "original-figure");
      const image = E("img", "original-image");
      image.src = crop.arquivo;
      image.loading = "lazy";
      image.width = crop.largura;
      image.height = crop.altura;
      image.alt = `${crop.tipo === "apoio" ? "Texto ou figura de apoio" : "Enunciado e alternativas"} da questão ${q.numero}, CGE ${q.cge}, página ${crop.pagina}, parte ${index + 1} de ${q.recortes.length}`;
      add(figure, E("figcaption", "media-caption", `${crop.tipo === "apoio" ? "Apoio da questão" : "Questão original"} · página ${crop.pagina}`), image);
      add(wrap, figure);
    });
    add(wrap, E("p", "crop-note", "A numeração impressa nas imagens é a da prova original. Confira a prévia antes de imprimir."));
    return wrap;
  }

  function questionPresentation(q, selected = null, reveal = true, showOptions = true, initiallyOriginal = false) {
    const wrap = E("div", "question-presentation");
    const controls = E("div", "question-view-controls");
    const toggle = E("div", "view-toggle");
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "Apresentação da questão");
    const content = E("div", "question-body");
    const text = button("Texto", "button button-secondary", () => show(false));
    const original = button("Imagem original", "button button-secondary original-toggle", () => show(true));
    add(toggle, text, original);
    add(controls, toggle, selectionButton(q));
    function show(isOriginal) {
      text.setAttribute("aria-pressed", String(!isOriginal));
      original.setAttribute("aria-pressed", String(isOriginal));
      content.replaceChildren();
      if (isOriginal) add(content, originalImages(q));
      else {
        add(content, context(q), questionImages(q), E("div", "question-text", q.enunciado), showOptions ? optionRows(q, selected, reveal) : null);
        if (!choices.every(letter => hasChoice(q, letter))) add(content, E("p", "note", "Algumas alternativas ainda não foram transcritas; consulte a imagem original."));
      }
    }
    add(wrap, controls, content); show(initiallyOriginal);
    return wrap;
  }

  function changePrintSelection(ids, message = "") {
    state.printFeedback = message ? { message, previousIds: state.print.ids.slice() } : null;
    state.print.ids = ids;
    saveSelection();renderPrintBuilder();
    root.querySelectorAll(".print-feedback")[0]?.focus();
  }

  function renderPrintBuilder() {
    root.replaceChildren();
    const selected = state.print.ids.map(id => byId.get(id));
    const pageIntro = intro("Sua seleção para impressão", "Monte um caderno de exercícios.",
      "Escolha questões na Biblioteca e organize a ordem aqui. A prova usa recortes do PDF original; o gabarito é impresso separadamente.");
    add(pageIntro, button("Escolher questões →", "button button-secondary", () => switchView("library")));
    add(root, pageIntro);
    if (state.printFeedback) {
      const feedback = E("div", "print-feedback");
      feedback.setAttribute("role", "status");feedback.tabIndex = -1;
      const previousIds = state.printFeedback.previousIds;
      add(feedback, E("span", "", state.printFeedback.message),
        button("Desfazer", "button-text undo-print-selection", () => changePrintSelection(previousIds)));
      add(root, feedback);
    }
    if (!selected.length) {
      add(root, add(E("div", "panel empty"), E("h2", "", "Seu caderno começa com uma questão."),
        E("p", "", "Na Biblioteca, use “Selecionar para impressão” nos cartões que deseja incluir."),
        button("Abrir Biblioteca", "button", () => switchView("library"))));
      return;
    }
    const workspace = E("div", "workspace print-builder");
    const aside = E("aside", "panel filter-panel");
    add(aside, E("h2", "", "Cabeçalho"));
    const inputField = (label, property, max) => {
      const wrap = E("div", "filter-group");
      const input = E("input", "field");
      input.value = state.print[property]; input.maxLength = max;
      input.setAttribute("aria-label", label);
      input.addEventListener("input", () => { state.print[property] = input.value.slice(0,max); saveSelection(); });
      add(wrap, E("label", "", label), input);return wrap;
    };
    add(aside, inputField("Título da prova", "title", 120), inputField("Turma", "className", 80), inputField("Data", "date", 30),
      E("p", "note", "O campo de nome do aluno fica em branco para preencher no papel."));
    const actions = E("div", "print-builder-actions");
    add(actions, button("Prévia da prova", "button preview-test", () => openPrintPreview(false)),
      button("Prévia do gabarito", "button button-secondary preview-key", () => openPrintPreview(true)));
    add(aside, actions, E("p", "field-help", storageAvailable ? "Seleção e cabeçalho salvos neste navegador." :
      "O navegador não permitiu salvar a seleção. Ela ficará disponível enquanto esta aba estiver aberta."));
    const main = E("section", "print-selection");
    main.setAttribute("aria-label", "Questões selecionadas para impressão");
    const pageCount = printModel.pack(selected).length;
    const countLabel = count => `${count} ${count === 1 ? "página" : "páginas"}`;
    const selectionTools = E("div", "print-selection-tools");
    add(selectionTools, E("span", "print-page-estimate", `${selected.length} no caderno · ${countLabel(pageCount)} A4`),
      button("Limpar seleção", "button-text clear-print-selection", () => changePrintSelection([], "Todas as questões foram removidas da seleção.")));
    add(main, add(E("div", "results-heading print-results-heading"), E("h2", "", "Questões selecionadas"), selectionTools));
    const organization = E("div", "panel print-organization");
    const organizationHelp = E("p", "field-help");
    const updateOrganizationHelp = () => {
      organizationHelp.textContent = state.printOrganization === "subject" ?
        "Agrupa Português, Matemática e Ciências, mantendo a ordem atual dentro de cada matéria." :
        state.printOrganization === "space" ?
        "Reordena as questões para reduzir espaços vazios; matérias podem se misturar. Mantém o tamanho dos recortes." :
        "Mantém cada matéria em sequência e procura encaixar melhor as questões dentro dela. Mantém o tamanho dos recortes.";
    };
    const organizationRow = E("div", "print-organization-row");
    add(organizationRow, selectField("Organizar questões", [["subject-space", "Matéria + aproveitar páginas"], ["subject", "Por matéria"],
      ["space", "Aproveitar páginas"]], state.printOrganization, value => { state.printOrganization = value;updateOrganizationHelp(); }),
      button("Organizar", "button organize-print-selection", () => {
        const ordered = printModel.organize(selected, state.printOrganization);
        const after = printModel.pack(ordered).length;
        const changed = ordered.some((q, index) => q.id !== selected[index].id);
        const prefix = changed ? "Questões reorganizadas." : "A ordem atual foi mantida.";
        const explanation = after > pageCount ? " Agrupar por matéria pode exigir mais páginas." :
          state.printOrganization !== "subject" && after === pageCount ? " Sem redução de páginas nesta seleção." : "";
        changePrintSelection(ordered.map(q => q.id), `${prefix} ${countLabel(pageCount)} → ${countLabel(after)} A4.${explanation}`);
      }));
    updateOrganizationHelp();add(organization, organizationRow, organizationHelp);add(main, organization,
      E("p", "note", "A ordem abaixo define a numeração da prova e do gabarito. As imagens mantêm também o número da questão na fonte original."));
    selected.forEach((q, index) => {
      const card = E("article", "panel print-selection-card");
      const heading = E("div", "print-selection-heading");
      const details = E("div");
      add(details, E("span", "eyebrow", `Questão ${index + 1} no caderno`), questionMeta(q));
      const controls = E("div", "print-order-controls");
      const up = button("↑", "button button-secondary move-up", () => {
        changePrintSelection(printModel.move(state.print.ids, index, -1));
      });
      up.setAttribute("aria-label", `Mover questão ${index + 1} para cima`);up.disabled = index === 0;
      const down = button("↓", "button button-secondary move-down", () => {
        changePrintSelection(printModel.move(state.print.ids, index, 1));
      });
      down.setAttribute("aria-label", `Mover questão ${index + 1} para baixo`);down.disabled = index === selected.length-1;
      const remove = button("Remover", "button-text remove-print-question", () => {
        changePrintSelection(state.print.ids.filter(id => id !== q.id));
      });
      remove.setAttribute("aria-label", `Remover questão ${index + 1} do caderno`);
      add(controls, up, down, remove);add(heading, details, controls);
      const preview = E("details", "print-crop-details");
      add(preview, E("summary", "", `Conferir recortes originais (${q.recortes?.length || 0})`));
      preview.addEventListener("toggle", () => {
        if (preview.open && !preview.dataset.loaded) { add(preview, originalImages(q)); preview.dataset.loaded = "true"; }
      });
      add(card, heading, E("p", "selection-excerpt", q.enunciado.slice(0,240) + (q.enunciado.length > 240 ? "…" : "")), preview);
      add(main, card);
    });
    add(workspace, aside, main);add(root, workspace);
  }

  function openPrintPreview(isKey) {
    const selected = state.print.ids.map(id => byId.get(id));
    if (!selected.length) return;
    const returnFocus = document.activeElement;
    const overlay = E("div", "print-overlay");
    overlay.setAttribute("role", "dialog");overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", isKey ? "Prévia do gabarito" : "Prévia da prova");
    const toolbar = E("div", "print-preview-toolbar");
    const status = E("p", "print-load-status", "Carregando imagens…");
    status.setAttribute("role", "status");
    const print = button(isKey ? "Imprimir gabarito" : "Imprimir prova", "button print-now", async () => {
      if (print.disabled) return;
      window.print();
    });
    print.disabled = true;
    let downloadURL;
    const download = button("Gerar PDF", "button button-secondary download-custom-pdf", async () => {
      download.disabled = true; download.textContent = "Gerando PDF…";
      try {
        const bytes = await window.SENAI_PDF.create({questions:selected,settings:{...state.print},isKey,
          loadImage: async filename => {
            const response = await fetch(filename);
            if (!response.ok) throw new Error("Imagem indisponível");
            return response.arrayBuffer();
          }});
        downloadURL = URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
        const link = E("a","button button-secondary save-custom-pdf","Baixar PDF ↓");
        link.href=downloadURL;link.download=isKey?"gabarito-caderno.pdf":"prova-caderno.pdf";
        download.replaceWith(link);link.focus();
        status.textContent="PDF pronto. Clique em Baixar PDF para salvar o arquivo e imprimir quando quiser.";
      } catch {
        status.textContent="Não foi possível gerar o PDF. Confira as imagens e use a opção Imprimir, se necessário.";
      } finally { download.disabled=false;download.textContent="Gerar PDF"; }
    });
    download.disabled=true;
    const close = button("← Voltar à seleção", "button button-secondary", () => {
      overlay.remove();document.body.classList.remove("print-preview-open");
      if (downloadURL) URL.revokeObjectURL(downloadURL);
      document.querySelector(".site-shell")?.removeAttribute("inert");
      returnFocus?.focus();
    });
    overlay.addEventListener("keydown", event => {
      if (event.key === "Escape") close.click();
      if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === close) { event.preventDefault(); (print.disabled ? close : print).focus(); }
        else if (!event.shiftKey && document.activeElement === (print.disabled ? close : print)) { event.preventDefault(); close.focus(); }
      }
    });
    const outputActions=E("div","print-output-actions");
    // Em file://, o navegador permite imprimir imagens, mas pode bloquear fetch de arquivos locais.
    if (isKey || window.location?.protocol !== "file:") add(outputActions,download);
    add(outputActions,print);
    add(toolbar, close, add(E("div"), E("strong", "", isKey ? "Gabarito para conferência" : "Prova do aluno"), status), outputActions);
    const paper = E("div", "print-pages");
    const images = [];
    const questionBadge = index => {
      const badge = E("span", "print-question-badge", `${index} / ${selected.length}`);
      badge.setAttribute("aria-label", `Questão ${index} de ${selected.length} no caderno`);
      return badge;
    };
    const sheetHeader = (first) => {
      const header = E("header", `print-sheet-header${first ? " first" : ""}`);
      add(header, E("h1", "", `${isKey ? "Gabarito · " : ""}${state.print.title || "Lista de exercícios"}`));
      if (first) {
        if (!isKey) add(header, E("p", "", "Nome: ______________________________________________________________"));
        add(header, E("p", "", `Turma: ${state.print.className || "________________"}     Data: ${state.print.date || "____/____/________"}`),
          E("small", "", isKey ? "O badge amarelo identifica a questão no caderno: número / total de questões." :
            "Use o número do badge amarelo (questão / total). Os números nas imagens são das provas originais."));
      }
      return header;
    };
    const addSheet = (index, total) => {
      const sheet = E("section", "print-sheet");
      add(sheet, sheetHeader(index === 0), E("div", "print-page-number", `${index + 1} / ${total}`));
      add(paper, sheet);return sheet;
    };
    if (isKey) {
      const count = Math.ceil(selected.length/32);
      for (let page = 0; page < count; page++) {
        const sheet = addSheet(page, count);
        const table = E("table", "print-answer-table");
        const header = E("tr");
        ["Questão", "Origem", "Disciplina", "Resposta"].forEach(label => add(header, E("th", "", label)));
        add(table, add(E("thead"), header));const body = E("tbody");
        selected.slice(page*32,page*32+32).forEach((q,index) => {
          const row = E("tr");
          add(row, add(E("td"), questionBadge(page*32+index+1)));
          [`CGE ${q.cge} · ${q.numero}`, q.disciplina, printModel.answer(q)]
            .forEach(value => add(row, E("td", "", value)));
          add(body,row);
        });
        add(table,body);add(sheet,table);
      }
    } else {
      const pages = printModel.pack(selected);
      pages.forEach((page,index) => {
        const sheet = addSheet(index,pages.length);
        page.items.forEach(item => {
          const block = E("section", "print-block");block.style.height = `${item.total}mm`;
          const label = `Questão ${item.index} · CGE ${item.cge} / original ${item.numero} · ${item.crop.tipo === "apoio" ? "Apoio" : "Questão"}${item.parts > 1 ? ` · parte ${item.part}/${item.parts}` : ""}`;
          add(block, add(E("div", "print-block-label"), E("span", "print-block-source", label), questionBadge(item.index)));
          const image = E("img", "print-crop");
          image.alt = label;image.width = item.crop.largura;image.height = item.crop.altura;
          image.style.width = `${item.width}mm`;image.style.height = `${item.height}mm`;
          // Todos os recortes devem carregar antes de habilitar a impressão.
          images.push(new Promise((resolve,reject) => {
            image.onload = () => resolve();image.onerror = () => reject(new Error(item.crop.arquivo));
          }));
          image.src = item.crop.arquivo;add(block,image);add(sheet,block);
        });
      });
    }
    add(overlay,toolbar,paper);document.body.appendChild(overlay);
    document.body.classList.add("print-preview-open");
    document.querySelector(".site-shell")?.setAttribute("inert", "");
    close.focus();
    Promise.all(images).then(() => {
      print.disabled = false;
      download.disabled = false;
      status.textContent = `${paper.children.length} ${paper.children.length === 1 ? "página" : "páginas"} · A4 · escala 100%. Desative cabeçalhos e rodapés do navegador. Pode salvar como PDF.`;
    }).catch(() => {
      status.textContent = "Uma imagem não carregou. Volte à seleção e abra a prévia novamente antes de imprimir.";
    });
  }

  function renderLibrary() {
    root.replaceChildren();
    const pageIntro = intro("Acervo de provas", "Todas as questões, em um lugar.", "Consulte os enunciados, alternativas e gabaritos. Use os filtros para encontrar o que quer revisar.");
    const action = button("Montar um simulado →", "button intro-action", () => switchView("study"));
    add(pageIntro, action);
    const stats = E("div", "stats");
    [[fmt(questions.length), "questões no acervo"], [fmt(data.exams.length), "provas completas"], [fmt(topics.length), "temas do programa"], [fmt(eligible.length), "questões para estudo"]].forEach(([number, label]) => add(stats, add(E("div", "stat"), E("strong", "", number), E("span", "", label))));
    const workspace = E("div", "workspace");
    const aside = E("aside", "panel filter-panel");
    add(aside, add(E("div", "panel-title"), E("h2", "", "Filtrar")));
    const searchGroup = E("div", "filter-group");
    const searchLabel = E("label", "", "Buscar por palavra ou expressão");
    searchLabel.htmlFor = "library-search";
    const search = E("input", "field");
    search.id = "library-search";
    search.type = "search";
    search.placeholder = "Ex.: crase, porcentagem";
    search.value = state.library.search;
    search.addEventListener("input", () => { state.library.search = search.value; state.library.page = 1; updateResults(); });
    add(searchGroup, searchLabel, search);
    const topicGroup = E("div", "filter-group");
    function rebuildTopicSelect() {
      topicGroup.replaceChildren();
      const filtered = topics.filter(t => !state.library.subject || t.disciplina === state.library.subject);
      const options = [["", "Todos os temas"], ...filtered.map(t => [t.id, t.nome])];
      add(topicGroup, selectField("Tema sugerido", options, state.library.topic, value => { state.library.topic = value; state.library.page = 1; updateResults(); }));
      add(topicGroup, E("small", "field-help", "Temas identificados por palavras do enunciado; algumas questões podem ficar sem tema ou precisar de revisão."));
    }
    const subject = selectField("Disciplina", [["", "Todas as disciplinas"], ...subjects.map(s => [s, s])], state.library.subject, value => {
      state.library.subject = value;
      if (state.library.topic && !topics.some(t => t.id === Number(state.library.topic) && (!value || t.disciplina === value))) state.library.topic = "";
      state.library.page = 1;
      rebuildTopicSelect();
      updateResults();
    });
    rebuildTopicSelect();
    const examOptions = [["", "Todas as provas"], ...data.exams.map(exam => [exam.cge, `CGE ${exam.cge} · ${exam.ano}`])];
    const exam = selectField("Caderno", examOptions, state.library.exam, value => { state.library.exam = value; state.library.page = 1; updateResults(); });
    add(aside, searchGroup, subject, topicGroup, exam);
    const clear = button("Limpar filtros", "button-text", () => {
      state.library = { search: "", subject: "", topic: "", exam: "", page: 1 };
      renderLibrary();
    });
    add(aside, clear);
    const results = E("section", "result-area");
    results.setAttribute("aria-label", "Lista de questões");
    function updateResults() {
      const f = state.library;
      const needle = plain(f.search.trim());
      const filtered = questions.filter(q =>
        (!f.subject || q.disciplina === f.subject) &&
        (!f.topic || q.temas.includes(Number(f.topic))) &&
        (!f.exam || q.cge === f.exam) &&
        (!needle || plain([q.enunciado, q.contexto, ...Object.values(q.alternativas)].join(" ")).includes(needle))
      );
      const pageSize = 20;
      const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
      f.page = Math.min(f.page, pageCount);
      results.replaceChildren();
      const heading = E("div", "results-heading library-results-heading");
      const tools = E("div", "results-tools");
      const presentation = E("div", "library-presentation");
      const toggle = E("div", "view-toggle");
      toggle.setAttribute("role", "group");
      toggle.setAttribute("aria-label", "Visualização de todas as questões");
      [["text", "Texto"], ["original", "Imagem original"]].forEach(([mode, label]) => {
        const control = button(label, `button button-secondary global-view-${mode}`, () => {
          state.libraryPresentation = mode;
          try { window.localStorage.setItem(presentationKey, mode); }
          catch { /* A preferência ainda é mantida durante esta sessão. */ }
          updateResults();
          results.querySelectorAll(`.global-view-${mode}`)[0].focus();
        });
        control.setAttribute("aria-pressed", String(state.libraryPresentation === mode));
        add(toggle, control);
      });
      add(presentation, E("span", "", "Exibir todas:"), toggle);
      add(tools, presentation, E("span", "result-count", `${fmt(filtered.length)} ${filtered.length === 1 ? "resultado" : "resultados"}`));
      add(heading, E("h2", "", "Questões"), tools);
      results.appendChild(heading);
      if (!filtered.length) {
        add(results, add(E("div", "panel empty"), E("h3", "", "Nenhuma questão encontrada"), E("p", "", "Experimente outra palavra, disciplina ou tema.")));
        return;
      }
      const list = E("div", "question-list");
      filtered.slice((f.page - 1) * pageSize, f.page * pageSize).forEach(q => add(list, libraryCard(q)));
      results.appendChild(list);
      const pagination = E("div", "pagination");
      add(pagination, E("span", "", `Página ${f.page} de ${pageCount}`));
      const controls = E("div", "pagination-controls");
      const prev = button("← Anterior", "button button-secondary", () => { f.page--; updateResults(); results.scrollIntoView({ block: "start" }); });
      const next = button("Próxima →", "button button-secondary", () => { f.page++; updateResults(); results.scrollIntoView({ block: "start" }); });
      prev.disabled = f.page <= 1;
      next.disabled = f.page >= pageCount;
      add(controls, prev, next);
      add(pagination, controls);
      add(results, pagination);
    }
    add(workspace, aside, results);
    add(root, pageIntro, stats, workspace);
    updateResults();
  }

  function renderExams() {
    root.replaceChildren();
    const allDocuments = data.exams.flatMap(exam => exam.documentos);
    const years = [...new Set(data.exams.map(exam => exam.ano))].sort((a, b) => Number(b) - Number(a));
    const modalities = [...new Set(data.exams.map(exam => exam.modalidade))].sort();
    const pageIntro = intro("Documentos do acervo", "Provas prontas para consultar e imprimir.",
      "Encontre o caderno pelo ano, semestre ou modalidade. Cada registro traz os PDFs usados, seus gabaritos e a fonte original.");
    const stats = E("div", "stats");
    [[fmt(data.exams.length), "cadernos de prova"], [fmt(allDocuments.length), "PDFs distintos"],
      [fmt(years.length), "anos no acervo"], [fmt(questions.length), "questões vinculadas"]]
      .forEach(([number, label]) => add(stats, add(E("div", "stat"), E("strong", "", number), E("span", "", label))));
    const workspace = E("div", "workspace");
    const aside = E("aside", "panel filter-panel");
    add(aside, add(E("div", "panel-title"), E("h2", "", "Filtrar provas")));
    const searchGroup = E("div", "filter-group");
    const searchLabel = E("label", "", "Buscar CGE ou arquivo");
    searchLabel.htmlFor = "exam-search";
    const search = E("input", "field");
    search.id = "exam-search";
    search.type = "search";
    search.placeholder = "Ex.: 2245 ou 2024";
    search.value = state.exams.search;
    search.addEventListener("input", () => { state.exams.search = search.value; updateResults(); });
    add(searchGroup, searchLabel, search);
    const year = selectField("Ano", [["", "Todos os anos"], ...years.map(item => [item, item])], state.exams.year,
      value => { state.exams.year = value; updateResults(); });
    const modality = selectField("Modalidade", [["", "Todas as modalidades"], ...modalities.map(item => [item, item])], state.exams.modality,
      value => { state.exams.modality = value; updateResults(); });
    const semester = selectField("Semestre", [["", "Todos os semestres"], ["1", "1º semestre"], ["2", "2º semestre"]], state.exams.semester,
      value => { state.exams.semester = value; updateResults(); });
    add(aside, searchGroup, year, modality, semester,
      button("Limpar filtros", "button-text", () => {
        state.exams = { search: "", year: "", modality: "", semester: "" };
        renderExams();
      }));
    const results = E("section", "result-area");
    results.setAttribute("aria-label", "Lista de provas e PDFs");
    function renderDocument(doc, exam) {
      const section = E("section", "exam-document");
      const heading = E("div", "exam-document-heading");
      add(heading, E("h4", "", doc.tipo), pill(doc.origem_oficial ? "Fonte oficial" : "Fonte de acervo"));
      const checkedDate = doc.verificado_em.split("-").reverse().join("/");
      const facts = E("p", "exam-document-facts", `${fmt(doc.paginas)} ${doc.paginas === 1 ? "página" : "páginas"} · ${(doc.bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB · PDF · Download verificado em ${checkedDate}`);
      const actions = E("div", "exam-document-actions");
      if (doc === exam.documentos[0]) add(actions, examButton(exam.cge, "button button-secondary"));
      const open = E("a", "button button-secondary", "Abrir PDF ↗");
      open.href = doc.arquivo;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      add(actions, open, downloadLink(doc, `Baixar ${doc.tipo.toLowerCase()} ↓`, "button"));
      const sourceHost = doc.url.match(/^https?:\/\/([^/?#]+)/)?.[1] || doc.url;
      const source = E("a", "exam-source-link", `Fonte original: ${sourceHost} ↗`);
      source.href = doc.url;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      const details = E("details", "exam-document-details");
      const metadata = E("dl", "exam-file-metadata");
      [["Arquivo original", doc.arquivo_original], ["Endereço de origem", doc.url],
        ["Download verificado em", doc.verificado_em], ["SHA-256", doc.sha256]]
        .forEach(([label, value]) => add(metadata, E("dt", "", label), E("dd", "", value)));
      add(details, E("summary", "", "Detalhes do arquivo"), metadata);
      add(section, heading, facts, actions, source, details);
      return section;
    }
    function renderExamCard(exam) {
      const card = E("article", "panel exam-card");
      const header = E("div", "exam-card-header");
      const title = E("div");
      add(title, E("span", "eyebrow", `CGE ${exam.cge}`), E("h3", "", `${exam.ano} · ${exam.semestre}º semestre`));
      const showQuestions = button("Ver questões →", "button-text", () => {
        state.library.exam = exam.cge;
        state.library.page = 1;
        switchView("library");
      });
      add(header, title, showQuestions);
      const summary = E("div", "exam-card-summary");
      add(summary, pill(exam.modalidade), E("span", "", `${fmt(exam.questoes)} questões`),
        E("span", "", `${fmt(exam.paginas)} páginas na prova`));
      const documents = E("div", "exam-documents");
      exam.documentos.forEach(doc => add(documents, renderDocument(doc, exam)));
      add(card, header, summary, documents);
      return card;
    }
    function updateResults() {
      const filter = state.exams;
      const needle = plain(filter.search.trim());
      const filtered = data.exams.filter(exam =>
        (!filter.year || exam.ano === filter.year) &&
        (!filter.modality || exam.modalidade === filter.modality) &&
        (!filter.semester || exam.semestre === filter.semester) &&
        (!needle || plain([exam.cge, exam.ano, exam.modalidade, ...exam.documentos.map(doc => doc.nome)].join(" ")).includes(needle))
      );
      results.replaceChildren();
      const heading = E("div", "results-heading");
      add(heading, E("h2", "", "Cadernos disponíveis"), E("span", "", `${fmt(filtered.length)} ${filtered.length === 1 ? "prova" : "provas"}`));
      add(results, heading, E("p", "exam-date-note", "A data exata da aplicação não consta no acervo. “Download verificado em” indica quando o arquivo foi conferido, não a data da prova."));
      if (!filtered.length) {
        add(results, add(E("div", "panel empty"), E("h3", "", "Nenhuma prova encontrada"), E("p", "", "Tente outro ano, semestre, modalidade ou CGE.")));
      } else {
        const list = E("div", "exam-list");
        filtered.forEach(exam => add(list, renderExamCard(exam)));
        add(results, list);
      }
    }
    add(workspace, aside, results);
    add(root, pageIntro, stats, workspace);
    updateResults();
  }

  function studyPool() {
    const selected = state.study.topics;
    return eligible.filter(q =>
      (!state.study.subject || q.disciplina === state.study.subject) &&
      (!selected.size || q.temas.some(id => selected.has(id)))
    );
  }

  function randomIndex(max) {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      do { window.crypto.getRandomValues(value); } while (value[0] >= limit);
      return value[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function sample(pool, count) {
    const copy = pool.slice();
    for (let i = 0; i < Math.min(count, copy.length); i++) {
      const j = i + randomIndex(copy.length - i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  function startSession() {
    const pool = studyPool();
    if (!pool.length) return;
    state.session = { ids: sample(pool, state.study.count).map(q => q.id), answers: {}, index: 0, finished: false };
    renderStudy();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStudy() {
    root.replaceChildren();
    const pageIntro = intro("Seu espaço de prática", "Estude no seu ritmo.", "Escolha disciplinas e temas, responda sem ver o gabarito e confira o resultado ao terminar.");
    const workspace = E("div", "workspace");
    const aside = E("aside", "panel filter-panel study-aside");
    add(aside, add(E("div", "panel-title"), E("h2", "", "Seu simulado")));
    add(aside, selectField("Disciplina", [["", "Todas as disciplinas"], ...subjects.map(s => [s, s])], state.study.subject, value => {
      state.study.subject = value;
      state.study.topics.clear();
      renderStudy();
    }));
    const topicGroup = E("div", "filter-group");
    add(topicGroup, E("span", "label", "Temas — pode escolher vários"));
    const topicList = E("div", "topic-list");
    const availableTopics = topics.filter(t => !state.study.subject || t.disciplina === state.study.subject);
    availableTopics.forEach(topic => {
      const row = E("label", "topic-choice");
      const first = E("span");
      const check = E("input");
      check.type = "checkbox";
      check.value = String(topic.id);
      check.checked = state.study.topics.has(topic.id);
      check.addEventListener("change", () => {
        if (check.checked) state.study.topics.add(topic.id); else state.study.topics.delete(topic.id);
        updateAvailable();
      });
      add(first, check, E("span", "", topic.nome));
      add(row, first, E("span", "topic-count", fmt(eligibleTopicCounts.get(topic.id) || 0)));
      add(topicList, row);
    });
    add(topicGroup, topicList, E("small", "field-help", "Sem seleção: todos os temas, inclusive questões sem tema sugerido."));
    add(aside, topicGroup);
    add(aside, selectField("Quantidade de questões", [[5, "5 questões"], [10, "10 questões"], [20, "20 questões"]], state.study.count, value => { state.study.count = Number(value); updateAvailable(); }));
    const available = E("p", "");
    available.setAttribute("aria-live", "polite");
    const start = button("Sortear questões →", "button", startSession);
    start.style.width = "100%";
    function updateAvailable() {
      const count = studyPool().length;
      available.textContent = `${fmt(count)} ${count === 1 ? "questão disponível" : "questões disponíveis"} com estes filtros.`;
      start.disabled = count === 0;
    }
    add(aside, available, start, E("small", "field-help", "O sorteio usa apenas questões com transcrição completa e gabarito válido."));
    const main = E("section", "study-main");
    main.setAttribute("aria-label", "Área de estudo");
    if (!state.session) renderStudyWelcome(main);
    else if (state.session.finished) renderStudyResults(main);
    else renderQuizQuestion(main);
    add(workspace, aside, main);
    add(root, pageIntro, workspace);
    updateAvailable();
  }

  function renderStudyWelcome(main) {
    const panel = E("div", "panel study-welcome");
    add(panel, E("span", "eyebrow", "Pronto para começar?"), E("h2", "", "Um caderno só seu."), E("p", "", "As perguntas vêm das provas originais. Escolha seus temas à esquerda, marque as alternativas e descubra seus acertos no final."));
    add(main, panel);
  }

  function renderQuizQuestion(main) {
    const session = state.session;
    const q = byId.get(session.ids[session.index]);
    const panel = E("article", "panel question-card");
    const answered = Object.keys(session.answers).length;
    add(panel, E("div", "study-counter", `Questão ${session.index + 1} de ${session.ids.length} · ${answered} respondidas`));
    const track = E("div", "progress-track");
    const fill = E("div", "progress-fill");
    fill.style.width = `${((session.index + 1) / session.ids.length) * 100}%`;
    add(panel, add(track, fill), questionMeta(q), questionPresentation(q, null, false, false));
    const options = E("div", "options");
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "Alternativas da questão");
    choices.forEach(letter => {
      const option = button("", "quiz-option", () => {
        session.answers[q.id] = letter;
        options.querySelectorAll(".quiz-option").forEach(element => { element.classList.remove("is-selected"); element.setAttribute("aria-pressed", "false"); });
        option.classList.add("is-selected");
        option.setAttribute("aria-pressed", "true");
      });
      option.setAttribute("aria-pressed", session.answers[q.id] === letter ? "true" : "false");
      if (session.answers[q.id] === letter) option.classList.add("is-selected");
      add(option, E("span", "option-letter", letter), choiceContent(q, letter));
      add(options, option);
    });
    add(panel, options, variantButton(q, true), pageButton(q));
    const actions = E("div", "quiz-actions");
    const previous = button("← Anterior", "button button-secondary", () => { session.index--; renderStudy(); });
    previous.disabled = session.index === 0;
    const right = E("div", "quiz-actions-right");
    const next = button("Próxima →", "button button-secondary", () => { session.index++; renderStudy(); });
    next.disabled = session.index === session.ids.length - 1;
    const finish = button("Conferir resultados", "button", () => { session.finished = true; renderStudy(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    add(right, next, finish);
    add(actions, previous, right);
    add(panel, actions);
    add(main, panel);
  }

  function renderStudyResults(main) {
    const session = state.session;
    const got = session.ids.filter(id => session.answers[id] && session.answers[id] === byId.get(id).resposta).length;
    const skipped = session.ids.filter(id => !session.answers[id]).length;
    const score = E("div", "score-hero");
    add(score, E("span", "eyebrow", "Resultado do simulado"), E("h2", "", `${got} de ${session.ids.length} corretas`), E("p", "", `${skipped ? `${skipped} sem resposta. ` : ""}Veja abaixo o que acertou e confira o gabarito de cada pergunta.`));
    const actions = E("div", "quiz-actions");
    actions.style.borderTop = "0";
    actions.style.paddingTop = "0";
    actions.style.margin = "0 0 17px";
    add(actions, button("← Revisar na biblioteca", "button button-secondary", () => switchView("library")), button("Novo sorteio", "button", startSession));
    const list = E("div", "review-list");
    session.ids.forEach((id, index) => {
      const q = byId.get(id);
      const selected = session.answers[id];
      const result = !selected ? "Sem resposta" : selected === q.resposta ? "Acertou" : "Errou";
      const card = E("article", "panel review-card");
      const top = E("div", "review-top");
      add(top, E("span", "meta-number", `Questão ${index + 1} · CGE ${q.cge} / ${q.numero}`), E("span", `review-result ${!selected ? "skip" : selected === q.resposta ? "good" : "bad"}`, result));
      add(card, top, questionPresentation(q, selected, true), sourceFooter(q, selected));
      add(list, card);
    });
    add(main, score, actions, list);
  }

  function renderSimilarity() {
    root.replaceChildren();
    const summary = similarity.resumo;
    const linked = Number(summary.questoes_com_relacao || 0);
    const near = Number(summary.questoes_quase_iguais || 0);
    const methodOnly = questions.filter(item => !item.similares?.some(link => link.tipo === "quase_igual") && item.similares?.some(link => link.tipo === "mesmo_metodo")).length;
    const skillOnly = Math.max(0, linked - near - methodOnly);
    const unlinked = questions.length - linked;
    const pageIntro = intro("Mapa de variantes", "A mesma habilidade, de outro jeito.",
      "Veja quais questões retomam uma forma de resolver ou interpretar, mesmo quando mudam o contexto e os números.");
    const summaryCards = E("div", "stats similarity-stats");
    [[fmt(questions.length), "questões analisadas"], [fmt(linked), "com variante identificada"],
      [fmt(near), "com enunciado quase igual"], [fmt(similarity.familias.length), "famílias encontradas"]]
      .forEach(([number, label]) => add(summaryCards, add(E("div", "stat"), E("strong", "", number), E("span", "", label))));
    const overview = E("section", "panel similarity-overview");
    const overviewHead = E("div", "similarity-overview-head");
    add(overviewHead, add(E("div"), E("span", "eyebrow", "No acervo inteiro"),
      E("h2", "", `${String(summary.percentual_com_relacao || 0).replace(".", ",")}% têm variante identificada`)),
      E("p", "", "Um vínculo representa uma habilidade ou procedimento próximo. Isso não quer dizer que as perguntas sejam cópias."));
    const track = E("div", "similarity-track");
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", `${near} questões com enunciado quase igual, ${methodOnly} com mesmo procedimento, ${skillOnly} com mesma habilidade e ${unlinked} sem relação confirmada`);
    [["near", near], ["method", methodOnly], ["skill", skillOnly], ["unlinked", unlinked]].forEach(([name, count]) => {
      const segment = E("span", `similarity-segment segment-${name}`);
      segment.style.width = `${100 * count / questions.length}%`;
      add(track, segment);
    });
    const legend = E("div", "similarity-legend");
    [["near", "Enunciado quase igual", near], ["method", "Mesmo procedimento", methodOnly], ["skill", "Mesma habilidade", skillOnly],
      ["unlinked", "Sem relação confirmada", unlinked]].forEach(([name, label, count]) =>
      add(legend, add(E("div", "legend-item"), E("span", `legend-dot dot-${name}`),
        E("strong", "", label), E("span", "", `${fmt(count)} · ${(100 * count / questions.length).toFixed(1).replace(".", ",")}%`))));
    const subjectChart = E("div", "subject-chart");
    add(subjectChart, E("h3", "", "Por disciplina"));
    subjects.forEach(subject => {
      const set = questions.filter(item => item.disciplina === subject);
      const count = set.filter(item => item.similares?.length).length;
      const row = E("div", "subject-row");
      const labels = E("div", "subject-labels");
      add(labels, E("span", "", subject), E("strong", "", `${(100 * count / set.length).toFixed(1).replace(".", ",")}% · ${fmt(count)} de ${fmt(set.length)}`));
      const bar = E("div", "subject-bar");
      const fill = E("span", "subject-bar-fill");
      fill.style.width = `${100 * count / set.length}%`;
      add(bar, fill); add(row, labels, bar); add(subjectChart, row);
    });
    add(overview, overviewHead, track, legend, subjectChart,
      E("p", "note", `A auditoria registrou ${fmt(summary.pares_revisados || 0)} revisões explícitas e publicou ${fmt(summary.pares_novos_revisados || 0)} novos vínculos. Há ${fmt(summary.pares_pendentes || 0)} candidatos ainda pendentes. “Mesma habilidade” pode reunir procedimentos diferentes. “Sem relação confirmada” significa apenas que não foi encontrado um par forte; não prova que a questão seja única.`));

    const familiesSection = E("section", "families-section");
    const controls = E("div", "families-heading");
    add(controls, add(E("div"), E("span", "eyebrow", "Explorar o acervo"), E("h2", "", "Famílias de questões")));
    const filters = E("div", "family-filters");
    const input = E("input", "field");
    input.type = "search"; input.placeholder = "Buscar habilidade";
    input.setAttribute("aria-label", "Buscar famílias por habilidade");
    input.value = state.similarity.search;
    input.addEventListener("input", () => { state.similarity.search = input.value; updateFamilies(); });
    const select = E("select", "field");
    select.setAttribute("aria-label", "Filtrar famílias por disciplina");
    [["", "Todas as disciplinas"], ...subjects.map(subject => [subject, subject])].forEach(([value, label]) => {
      const option = E("option", "", label); option.value = value; option.selected = value === state.similarity.subject; add(select, option);
    });
    select.addEventListener("change", () => { state.similarity.subject = select.value; updateFamilies(); });
    add(filters, input, select); add(controls, filters);
    const familyList = E("div", "family-grid");
    function updateFamilies() {
      familyList.replaceChildren();
      const needle = plain(state.similarity.search);
      const families = similarity.familias.filter(family =>
        (!state.similarity.subject || family.disciplina === state.similarity.subject) &&
        (!needle || plain(family.nome).includes(needle)));
      families.forEach(family => {
        const card = E("article", "panel family-card");
        add(card, E("span", "family-subject", family.disciplina), E("h3", "", family.nome),
          E("span", "family-kind", family.tipo === "quase_igual" ? "Enunciado quase igual" : family.tipo === "mesmo_metodo" ? "Mesmo procedimento" : "Mesma habilidade"));
        const samples = family.questoes.slice(0, 2).map(id => byId.get(id)).filter(Boolean);
        const sampleList = E("div", "family-samples");
        samples.forEach(item => add(sampleList, add(E("p", ""), E("strong", "", `CGE ${item.cge} · `),
          E("span", "", item.enunciado.replace(/\s+/g, " ").slice(0, 150) + (item.enunciado.length > 150 ? "…" : "")))));
        add(card, E("span", "family-count", `${family.questoes.length} questões`), sampleList,
          button("Comparar questões ↗", "button button-secondary", () => openVariantDialog(null, false, family)));
        add(familyList, card);
      });
      if (!families.length) add(familyList, add(E("div", "panel empty"), E("h3", "", "Nenhuma família encontrada"), E("p", "", "Tente outra busca ou disciplina.")));
    }
    add(familiesSection, controls, familyList);
    add(root, pageIntro, summaryCards, overview, familiesSection);
    updateFamilies();
  }

  function renderAbout() {
    root.replaceChildren();
    add(root, intro("Sobre este material", "Do caderno ao estudo.", "As questões foram transcritas de provas de aprendizagem industrial de nível fundamental e ligadas aos gabaritos correspondentes."));
    const grid = E("div", "about-grid");
    const provenance = E("section", "panel about-card");
    add(provenance, E("h2", "", "O que está incluído"), E("p", "", `${fmt(exams.size)} provas completas, ${fmt(questions.length)} questões e os PDFs originais. A Biblioteca mostra todas as perguntas, inclusive anuladas ou com transcrição a revisar.`));
    const list = E("ul");
    const readyCount = questions.filter(q => q.extracao === "pronta").length;
    const visualCount = questions.filter(q => q.visual).length;
    [`${fmt(questions.filter(q => q.gabarito === "válida").length)} questões com gabarito válido; ${fmt(questions.filter(q => q.gabarito === "anulada").length)} anuladas.`, `${fmt(readyCount)} transcrições prontas; ${fmt(questions.length - readyCount)} sinalizadas para revisão.`, `${fmt(visualCount)} questões sinalizadas com imagem, gráfico ou tabela, mostrados no cartão.`].forEach(item => add(list, E("li", "", item)));
    add(provenance, list);
    const method = E("section", "panel about-card");
    add(method, E("h2", "", "Como usar os temas"), E("p", "", "Os 24 temas vêm do programa do processo seletivo. A associação entre pergunta e tema foi sugerida automaticamente por palavras do enunciado; ainda não passou por revisão pedagógica. Uma pergunta pode ter mais de um tema ou nenhum."), E("p", "", "Para um estudo mais preciso, combine tema com a busca por palavras na Biblioteca. No simulado, deixar os temas em branco inclui também as questões sem tema sugerido."));
    const offline = E("section", "panel about-card");
    add(offline, E("h2", "", "Funciona sem internet"), E("p", "", "Descompacte o ZIP e abra index.html no navegador. Os dados, imagens das páginas e PDFs estão dentro da mesma pasta. Também é possível publicar esta pasta em uma hospedagem estática."), E("p", "", "As respostas do simulado ficam apenas na aba aberta; ao fechá-la, a sessão se perde."));
    const caution = E("section", "panel about-card");
    add(caution, E("h2", "", "Confira a fonte"), E("p", "", "Alguns enunciados foram extraídos automaticamente e podem conter quebras de linha ou caracteres imperfeitos. Quando a figura pôde ser isolada com segurança, ela aparece no cartão; nos demais casos, o cartão mostra a página original. Use “Ver página da prova” para ampliar e navegar."));
    add(grid, provenance, method, offline, caution);
    add(root, grid);
  }

  function switchView(view) {
    state.view = view;
    document.querySelectorAll(".nav-link").forEach(link => {
      const active = link.dataset.view === view;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    if (view === "library") renderLibrary();
    else if (view === "exams") renderExams();
    else if (view === "study") renderStudy();
    else if (view === "similarity") renderSimilarity();
    else if (view === "print") renderPrintBuilder();
    else renderAbout();
    window.scrollTo({ top: 0, behavior: "auto" });
    root.focus({ preventScroll: true });
  }

  document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => switchView(link.dataset.view)));
  saveSelection();
  switchView("library");
})();
