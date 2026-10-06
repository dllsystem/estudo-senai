# Estudo SENAI

Site estático para consultar e estudar 2.580 questões de 43 cadernos de provas. A tela **Provas e PDFs** permite filtrar por ano, semestre ou modalidade, visualizar os cadernos e baixar os 78 PDFs distintos de provas e gabaritos. Cada documento mostra o endereço de origem e a data em que o download foi verificado; a data exata de aplicação não consta no acervo. O site também inclui imagens das páginas e uma cópia do banco SQLite. A classificação de temas e similaridades é uma ferramenta de estudo, sujeita a revisão.

O projeto é independente e não é um serviço oficial do SENAI.

## Imagens originais e impressão

A Biblioteca abre com os recortes JPEG das questões por padrão e permite alternar para texto, individualmente ou para toda a lista. Cada questão inclui os textos e as figuras de apoio identificados na extração. **Mostrar resposta** revela a resposta correta no rodapé e destaca a alternativa no modo texto; **Ocultar resposta** esconde ambos novamente. **Ver gabarito** abre o PDF original em outra aba; nos arquivos que reúnem prova e gabarito, o link aponta para a página do gabarito.

Em **Montar prova**, selecione exercícios, ajuste título, turma e data e organize por matéria ou para aproveitar melhor as páginas A4. É possível limpar a seleção e desfazer a limpeza ou a organização. A prévia e o PDF mostram badges amarelos com **número / total de questões**, repetidos nas partes da mesma questão e no gabarito separado.

A geração do PDF acontece no navegador. Preferências e seleções ficam no armazenamento local de cada navegador e endereço; não são enviadas a serviços externos. Os recortes foram extraídos automaticamente e conferidos por amostragem: revise a prévia antes de imprimir para alunos.

## Publicação no GitHub Pages

Publique a raiz deste repositório a partir da branch `main`. O `index.html` carrega os dados de `data.js` e os arquivos de mídia por caminhos relativos, compatíveis com a URL de um projeto (`https://usuario.github.io/nome-do-repositorio/`). Não há build nem servidor.

Todos os arquivos do repositório e do site publicado ficam públicos no GitHub Pages gratuito, incluindo PDFs e SQLite.

## Uso local

Abra `index.html` no navegador. O `README.txt` descreve as telas e o acervo.

## Consulta às respostas

As respostas e os gabaritos começam ocultos. A primeira consulta inicia uma contagem de **20 segundos**, sem senha, e libera o acesso por **4 horas nesta aba**. A recarga preserva o tempo restante e não renova o prazo. **Cancelar** interrompe a espera; **Bloquear agora** encerra a liberação. Para abrir um PDF em outra aba, clique em **Continuar** ao terminar a contagem.

A mesma liberação vale para a correção do simulado, o gabarito de impressão e o download do SQLite. Os arquivos do site estático continuam públicos. Consulte [o funcionamento da liberação](ACESSO_RESPOSTAS.md).

## Classificação por conteúdo

As 2.580 questões têm sugestões do Jev para temas, subtemas, habilidades, métodos e contexto. A Biblioteca combina busca, disciplina, tema, subtema e caderno, com habilidade, método, contexto, conteúdo complementar e conferência em **Filtros avançados**. Os filtros ativos podem ser removidos individualmente ou todos de uma vez; **Somente selecionadas para impressão** permite revisar a seleção. A aba **Programa da prova** abre as questões de cada tema ou subtema na própria Biblioteca. Cada cartão inclui **Detalhes da classificação** expansíveis.

A tela separada **Classificação** mantém sua interface e seus filtros independentes, com consulta ao programa de 24 temas/107 subtemas e aos resultados do piloto. O modo Estudar também utiliza os novos temas.

As classificações são revisáveis; 800 questões receberam indicação de conferência. Os agrupamentos de similaridade foram preservados. O SQLite inclui a versão atual e o histórico auditável, sem credenciais; o navegador não chama a API. Consulte [a documentação da classificação](CLASSIFICACAO.md) para critérios, custos e consultas SQL.
