# Acesso às respostas e aos gabaritos

As respostas começam ocultas e bloqueadas. Não há cadastro, conta ou área separada de professor. Ao tentar mostrar uma resposta ou consultar um gabarito, o site solicita a senha compartilhada dos professores. O botão **Desbloquear** no topo também abre essa janela.

Uma senha correta libera as ações protegidas por **4 horas nesta aba**. O prazo começa no desbloqueio e não é renovado ao navegar, usar filtros ou recarregar a página. A sessão usa `sessionStorage`; quando esse recurso não está disponível, vale apenas enquanto a página permanece aberta. A senha digitada não é armazenada. **Bloquear agora** encerra o acesso imediatamente.

Ao vencer o prazo, as respostas reveladas e a correção do simulado são ocultadas, as janelas de variantes e páginas são fechadas e uma prévia de gabarito aberta também é encerrada. O prazo é verificado pelo temporizador e ao voltar à aba ou imprimir. Um PDF já baixado ou aberto em outra aba permanece sob controle do navegador.

## Ações protegidas

- Mostrar respostas e destacar alternativas corretas na Biblioteca, na Classificação e nas variantes.
- Abrir o PDF do gabarito original.
- Consultar páginas identificadas como gabarito dentro de um PDF que reúne prova e respostas.
- Abrir, baixar ou consultar a fonte de PDFs que contêm gabarito, inclusive o endereço apresentado nos detalhes do documento.
- Visualizar a correção do simulado, com acertos, erros e respostas corretas.
- Visualizar, gerar PDF e imprimir o gabarito do caderno personalizado.
- Baixar o SQLite completo pela interface, pois ele contém as respostas.

Pesquisa, filtros, seleção para impressão, questões e alternativas, preenchimento do simulado e impressão da prova continuam disponíveis ao aluno. Ao finalizar um simulado bloqueado, o aluno vê quantas questões respondeu e pode voltar às suas respostas. A correção exige a senha.

## Configuração

`teacher-access-config.js` contém somente um salt aleatório e o SHA-256 de `salt:senha`. A senha não fica em texto aberto nesse arquivo. `teacher-access.js` valida a senha no próprio navegador, controla o prazo e avisa a interface quando o acesso expira.

Para trocar a senha, execute o script local `outputs/banco_questoes/configurar_senha_professor.py`. Ele solicita a nova senha sem exibi-la no terminal e atualiza somente o arquivo de configuração local. A troca invalida as sessões antigas depois que a página carrega a nova configuração. A publicação dessa alteração é uma etapa separada.

## Limite do bloqueio

Este é um **bloqueio de interface**, adequado para o uso simples solicitado, e não uma autorização verificada por servidor. Num site estático, o navegador recebe os dados, o código de validação e os arquivos públicos. Quem conhece seus endereços ou inspeciona os arquivos pode obter respostas ou contornar a interface. O hash não transforma esses arquivos em conteúdo privado. Para impedir esse acesso, seria necessário proteger os dados e PDFs em um servidor ou serviço com autenticação.

## Validação

O teste `node outputs/banco_questoes/testar_acesso_professor.js` cobre senha incorreta, desbloqueio, prazo fixo de 4 horas, recarga, expiração, bloqueio manual, mudança de configuração, indisponibilidade do armazenamento e cancelamento durante a validação.

Os testes no navegador cobriram Biblioteca, Classificação, variantes, correção do simulado, prévias de impressão, geração de PDF do gabarito, exportação do SQLite e um caderno com gabarito na primeira página. A seleção preexistente de 14 questões foi preservada.

Esses testes foram feitos no localhost. A abertura por `file://` não pôde ser conferida: a política do navegador de teste permite somente HTTP e HTTPS. O bloqueio não usa servidor, chamadas externas ou dependências remotas.
