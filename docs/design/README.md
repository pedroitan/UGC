# Telas de referência

Cinco telas do MVP em 1440 × 900, feitas como mockups navegáveis. Use-as como **referência visual e de conteúdo**, não como código de produção: reimplemente em Next.js + Tailwind + shadcn/ui.

| Arquivo | Tela | O que observar |
| --- | --- | --- |
| `Main.dc.html` | Dashboard | Resumo do dia (4 cards), pautas quentes com botões por formato, fila de revisão, próximas publicações |
| `Radar.dc.html` | Radar de pautas | Chips de palavras-chave (incluir/excluir), cards com score e barra, botões Carrossel/Feed/Story/Reel, painel de fontes |
| `Estudio.dc.html` | Estúdio | Abas de formato, trilho de slides, prévia no celular (4:5 e story 9:16), painel de edição, checagem de fatos, templates, "Pedir ajuste à IA" |
| `Calendario.dc.html` | Calendário | Semana × horários, cor por formato, borda tracejada = aguardando aprovação, "assistida" |
| `BrandKit.dc.html` | Brand Kit | Logos claro/escuro, paleta, tipografia, tom de voz, posts de referência, templates ativos |

Os arquivos `.dc.html` usam um runtime próprio do editor e não abrem sozinhos no navegador. Leia o HTML/CSS inline para extrair layout, textos e estados. Para imagens das telas, exporte PNGs pelo canvas (Share › Export) e salve nesta pasta.

## Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `ink` | `#17150F` | Texto principal, sidebar, botão primário |
| `paper` | `#F6F3EE` | Fundo da aplicação |
| `surface` | `#FFFFFF` | Cards e painéis |
| `line` | `#E4DED3` | Bordas de card |
| `line-strong` | `#D8D1C4` | Bordas de input e botão secundário |
| `muted` | `#5E584C` | Texto secundário |
| `accent` | `#E4572E` | Marca/realce (não usar com texto branco pequeno) |
| `accent-strong` | `#9E3113` | Texto de destaque, score quente |
| Carrossel | fundo `#FBE3DA` / texto `#9E3113` | Chips e calendário |
| Feed | `#DCE7F2` / `#1F4A73` | |
| Story | `#F5EBCF` / `#6B4E0C` | |
| Reel | `#DDEBE1` / `#2E5C3F` | |

- Tipografia: **Fraunces** (títulos, números) e **Manrope** (interface), via Google Fonts.
- Raios: 8 px (botões, inputs), 14–16 px (cards); sidebar escura de 232 px.
- Alvos de toque ≥ 44 px; contraste de texto ≥ 4.5:1.
- Datas, artistas e preços nos mockups estão como `[PLACEHOLDER]` de propósito.
