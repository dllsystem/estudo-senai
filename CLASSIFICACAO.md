# Classificação do acervo SENAI

As 2.580 questões foram classificadas por Jev (`typesafe/jev-1.13-20260917`). A versão atual é `jev-conteudos-v3-20261003`. São sugestões automáticas revisáveis, não uma avaliação pedagógica certificada.

## O que está disponível

- 24 temas e 107 subtemas do programa em PDF; conteúdos complementares ficam separados.
- Tema principal, temas adicionais, subtemas, habilidade, método de resolução e contexto da história.
- 2540 questões associadas a temas do programa; 2316 com subtema sugerido.
- 800 questões sinalizadas para conferência, incluindo baixa confiança, extração a revisar ou possível informação faltante. Isso não significa 800 erros confirmados. 524 receberam indicação de consultar a fonte original.
- 41 têm o tema principal fora da lista e 2 não têm informação suficiente para identificar o tema principal. Essas contagens podem se sobrepor às de temas adicionais.

A tela **Classificação** combina todos os filtros. **Programa da prova** mostra as contagens no acervo inteiro. **Dados e avaliação** mostra cobertura, custo e os resultados separados do piloto anterior. Biblioteca e Estudar usam os novos temas. A seleção para impressão continua no navegador.

A visualização inicial de **Explorar questões** usa os mesmos cartões completos da Biblioteca: imagem original ou texto, alternativas, resposta correta, link para o PDF do gabarito e seleção para impressão. **Detalhes da classificação**, ao final de cada cartão, expande temas, subtemas, habilidades, método, contexto e a comparação com a referência. O seletor **Questões / Classificação** no topo alterna todos os resultados entre os cartões completos e o resumo de classificação, mantendo os filtros e a página atual. A seleção para impressão é compartilhada entre as telas.

Na Biblioteca e na Classificação, a resposta começa oculta em cada cartão. **Mostrar resposta** revela a resposta e destaca a alternativa correta no modo texto; **Ocultar resposta** esconde os dois novamente. O link **Ver gabarito** continua abrindo o PDF. Em **Programa da prova**, clicar no nome de um subtema abre as questões correspondentes, aplicando disciplina, tema e subtema e limpando os outros filtros.

## Biblioteca com filtros completos

A Biblioteca reúne busca, disciplina, tema, subtema e caderno. **Filtros avançados** expande habilidade, método, contexto, conteúdo complementar e conferência. Todos os critérios se combinam; os filtros ativos aparecem acima dos resultados e podem ser removidos individualmente ou de uma vez. Ao trocar de disciplina ou tema, subtemas incompatíveis são limpos.

**Somente selecionadas para impressão** mostra a seleção atual, em conjunto com os demais filtros. Desmarcar uma questão nesse modo a retira imediatamente da lista. A seleção é compartilhada com **Montar prova** e com a Classificação. Os cartões mantêm imagem/texto, resposta oculta até solicitar, PDF do gabarito, prova completa e seleção para impressão, além de **Detalhes da classificação** expansíveis.

A aba **Programa da prova** dentro da Biblioteca mostra os 24 temas e 107 subtemas. Clicar em um item abre os resultados na própria Biblioteca, limpando outros critérios. A tela separada **Classificação** mantém sua interface e seus filtros independentes. A implementação reutiliza a classificação já exportada do SQLite, sem novas chamadas ao Jev.

Validação local: `node outputs/banco_questoes/testar_filtros_biblioteca.js` confere os cruzamentos, dependências, seleção, filtros de conferência, ausência de classificação e as contagens de todos os 107 subtemas. Navegador: filtros combinados, remoção individual, programa → questões, seleção para impressão e preservação da Classificação.

## Critérios e limites

O tema principal usa escolha entre os assuntos da disciplina, fora do programa ou informação insuficiente. Assuntos adicionais e subtemas exigem probabilidade de pelo menos 0,70; o principal e os pais de subtemas selecionados também entram nos filtros. O limiar é uma política exploratória, não uma garantia de 70% de acerto. Métodos/contextos são escolhas predominantes; as demais etiquetas são múltiplas.

As instruções distinguem o conhecimento avaliado de operações auxiliares ou palavras incidentais. Na revisão, os subtemas homônimos “Operações; propriedades” receberam explicitamente o tema pai: inteiros ou racionais. Foram refeitas as 547 chamadas afetadas. Nos filtros, esses nomes também aparecem acompanhados do tema pai.

Subtemas foram consultados dentro de temas candidatos (principal e assuntos plausíveis). Um subtema não consultado não é um resultado negativo. Questões que dependem de imagens foram classificadas a partir do texto extraído e de descrições visuais previamente conferidas quando disponíveis; o Jev não recebeu as imagens neste processamento. Por isso existe a indicação de conferir a fonte.

Os agrupamentos de similaridade continuam anteriores. O piloto de similaridade ainda não sustenta aceitar automaticamente novos agrupamentos. Os números de concordância do piloto se referem à amostra de 60 questões/120 pares e à versão anterior das instruções; não medem a qualidade de todas as 2.580 classificações.

## Custo e execução

Foram 5.160 chamadas para temas e campos adicionais, mais 547 chamadas de refinamento: **5.707 chamadas cobradas**, sem falhas, no total de **US$ 0.82382815**. O custo inclui a primeira classificação dos subtemas depois refeitos. O piloto anterior de US$ 0,02078895 é separado. O limite de US$ 3 incluiu reservas conservadoras antes de cada chamada e o custo do piloto. Até seis chamadas simultâneas, sem repetir automaticamente tentativas incertas.

## SQLite principal

O arquivo `questoes_senai.sqlite3` contém as questões, as classificações e sua rastreabilidade. A cópia oferecida no site é a mesma do banco principal.

- `classificacoes_jev_atuais`: 2.580 classificações da versão atual, com resultado JSON completo.
- `etiquetas_jev_atuais`: probabilidades e decisão de seleção por tema, subtema, habilidade, método, contexto e complemento.
- `questao_assunto` / `questao_subassunto`: associações atuais, identificadas pelo método/versionamento; possíveis classificações manuais são preservadas.
- `execucoes_classificacao_jev`: versões, modelo, critérios, resumo e custos.
- `classificacoes_jev` / `etiquetas_classificacao_jev`: histórico das versões.
- `chamadas_classificacao_jev`: cada chamada paga, resposta completa, custo e entrada comprimida com zlib. A coluna `hash` é o SHA-256 do JSON original da requisição. Cabeçalhos de autenticação não são armazenados.
- `classificacao_chamadas`: liga a classificação atual às duas chamadas que a produziram, inclusive quando uma resposta foi reaproveitada da versão anterior.

Exemplo de consulta:

```sql
SELECT q.id, q.disciplina, c.tema_principal, c.confianca, c.precisa_revisao
FROM questoes q JOIN classificacoes_jev_atuais c ON c.questao_id=q.id;
```

Em Python, `zlib.decompress(request_zlib).decode('utf-8')` recupera a entrada exata da chamada. Nenhuma credencial integra o banco ou os arquivos do site. O navegador não chama OpenRouter: carrega somente arquivos estáticos com os resultados prontos.

## Reprodução e validação

Os scripts locais `classificar_acervo_jev.py` e `exportar_classificacao_jev.py` preparam, executam, importam e exportam. Os arquivos de trabalho estão em `work/classificacao_acervo_20261003/`, incluindo o banco anterior, hashes, tarefas congeladas e registro das chamadas.

A importação foi testada em cópia antes da aplicação. A repetição não duplicou dados. Foram conferidos os vínculos, a integridade do SQLite, todas as respostas estruturadas, os hashes das entradas, a preservação de questões/gabaritos/imagens/similaridades e a correspondência dos temas com a exportação estática. Testes no navegador local cobriram filtros, busca, questões fora do piloto, imagens, programa, Biblioteca e sorteio no modo Estudar. A seleção preexistente de 14 questões foi preservada.
