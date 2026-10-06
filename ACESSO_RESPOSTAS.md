# Liberação das respostas e dos gabaritos

As respostas começam ocultas. Não há senha, cadastro ou área separada de professor. Ao clicar em **Mostrar resposta**, **Ver gabarito**, **Conferir resultados** ou **Desbloquear**, o site inicia uma espera de **20 segundos**, com contagem regressiva e barra de progresso.

Ao terminar, as respostas e os gabaritos ficam disponíveis por **4 horas nesta aba**. A resposta solicitada aparece automaticamente. Para um arquivo aberto em outra aba ou baixado, a janela oferece **Continuar** ao terminar a espera; esse clique permite abrir o arquivo sem bloqueio de pop-up. As demais consultas não exigem uma nova espera durante a liberação.

Recarregar preserva o tempo restante da contagem e não renova as quatro horas. **Cancelar** interrompe a contagem; uma nova tentativa começa com 20 segundos. **Bloquear agora** ou o fim das quatro horas ocultam novamente as respostas e exigem uma nova espera. O controle usa `sessionStorage`; sem esse recurso, funciona em memória enquanto a página permanece aberta. Sessões da versão antiga com senha são descartadas.

## Ações que seguem a liberação

- Mostrar respostas e destacar alternativas corretas na Biblioteca, na Classificação e nas variantes.
- Abrir o gabarito original, inclusive páginas de respostas em documentos que também contêm a prova.
- Abrir, baixar ou consultar a fonte de PDFs que contêm gabarito.
- Conferir a correção do simulado, com acertos, erros e respostas corretas.
- Visualizar, gerar PDF e imprimir o gabarito do caderno personalizado.
- Baixar o SQLite completo pela interface, pois ele contém as respostas.

Pesquisa, filtros, seleção para impressão, questões e alternativas, preenchimento do simulado e impressão da prova continuam disponíveis antes da liberação. Ao vencer o prazo, a interface oculta as respostas reveladas, encerra a prévia do gabarito e fecha os visualizadores de variantes e páginas. PDFs já abertos ou baixados continuam sob controle do navegador.

## Implementação e limite

`answer-access.js` controla a contagem, a sessão e as notificações para a interface. Não há verificação de senha ou configuração de credencial. O banco e os dados das questões permanecem iguais.

A espera serve para adiar a consulta pela interface. Os dados e PDFs de um site estático continuam públicos; esse recurso não é uma autorização verificada por servidor. Funciona sem chamadas externas ou dependências remotas.

## Validação

`node outputs/banco_questoes/testar_acesso_respostas.js` verifica que não há liberação antes dos 20 segundos, cancelamento, recarga da contagem, expiração em quatro horas, bloqueio manual, descarte da sessão antiga e funcionamento sem armazenamento. A conferência no navegador usa a versão local HTTP.
