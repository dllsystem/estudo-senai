# Estudo SENAI

Site estático para consultar e estudar 2.580 questões de 43 cadernos de provas. A tela **Provas e PDFs** permite filtrar por ano, semestre ou modalidade, visualizar os cadernos e baixar os 78 PDFs distintos de provas e gabaritos. Cada documento mostra o endereço de origem e a data em que o download foi verificado; a data exata de aplicação não consta no acervo. O site também inclui imagens das páginas e uma cópia do banco SQLite. A classificação de temas e similaridades é uma ferramenta de estudo, sujeita a revisão.

O projeto é independente e não é um serviço oficial do SENAI.

## Imagens originais e impressão

A Biblioteca abre com os recortes JPEG das questões por padrão e permite alternar para texto, individualmente ou para toda a lista. Cada questão inclui os textos e as figuras de apoio identificados na extração. A resposta correta permanece visível no rodapé e destacada no modo texto. **Ver gabarito** abre o PDF original em outra aba; nos arquivos que reúnem prova e gabarito, o link aponta para a página do gabarito.

Em **Montar prova**, selecione exercícios, ajuste título, turma e data e organize por matéria ou para aproveitar melhor as páginas A4. É possível limpar a seleção e desfazer a limpeza ou a organização. A prévia e o PDF mostram badges amarelos com **número / total de questões**, repetidos nas partes da mesma questão e no gabarito separado.

A geração do PDF acontece no navegador. Preferências e seleções ficam no armazenamento local de cada navegador e endereço; não são enviadas a serviços externos. Os recortes foram extraídos automaticamente e conferidos por amostragem: revise a prévia antes de imprimir para alunos.

## Publicação no GitHub Pages

Publique a raiz deste repositório a partir da branch `main`. O `index.html` carrega os dados de `data.js` e os arquivos de mídia por caminhos relativos, compatíveis com a URL de um projeto (`https://usuario.github.io/nome-do-repositorio/`). Não há build nem servidor.

Todos os arquivos do repositório e do site publicado ficam públicos no GitHub Pages gratuito, incluindo PDFs e SQLite.

## Uso local

Abra `index.html` no navegador. O `README.txt` descreve as telas e o acervo.
