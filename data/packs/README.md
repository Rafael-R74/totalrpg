# Content Packs Locais — Arquitetura BYOC (*Bring Your Own Content*)

Para respeitar os direitos autorais das editoras e manter este repositório público seguro, o código-fonte do **TotalRPG** contém apenas:

- O **motor de regras** (fórmulas de PV/PE/PM/SAN, escalonamento de NEX/Nível, modificadores numéricos, rolagem de dados e validações).
- A **estrutura e metadados** de classes, trilhas, origens, perícias, equipamentos e rituais.
- **Referências de consulta** ao livro de regras no lugar de textos descritivos literais.

## Como usar textos completos na sua mesa pessoal

1. Crie ou obtenha seu pacote JSON local seguindo o formato de [content-pack.example.json](./content-pack.example.json).
2. Salve o arquivo nesta pasta com o sufixo `.local.json` ou `.pack.json` (por exemplo, `ordem-v1.3.local.json`) — esses arquivos são **automaticamente ignorados pelo Git** (`.gitignore`).
3. Você também pode importar o arquivo diretamente pela interface web no **Painel Admin** (`Importar Content Pack (.json)`), que salva em `data/packs/imported.local.json` e aplica imediatamente em memória e no banco de dados local.
