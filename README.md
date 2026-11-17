<p align="center"><img src="https://raw.githubusercontent.com/printer-buddy/printer-buddy/nightly/assets/logo.png" alt="Printer Buddy" width="160"></p>

# Print Buddy UI

The web interface for [Printer Buddy](https://github.com/printer-buddy/printer-buddy): the dashboard, printer pages
and every panel. Printer Buddy's installer fetches it next to the main app (`print-buddy-ui/`), which serves it at
`/static/`. Set `PB_UI_DIR` to use a copy somewhere else.

## Layout

```
index.html      main page
share.html      public share-link page
assets/         icons
core/           layout builder, panel registry, page-wide extras
panels/         one folder per panel (print, control, machine, camera)
styles/         builder.css
vendor/         echarts, echarts-gl, three.js
```
Each folder has a README.txt saying what's in it.

## Licenses

Copyright (C) 2026 sterling motuz. Licensed under the GNU Affero General Public License v3.0 only (AGPL-3.0-only), with extra terms: keep the licence header in each file, and include a CHANGELOG of any changes. See [LICENSE](LICENSE) and [NOTICE](NOTICE). The Printer Buddy name and logo are not covered by the licence.

Bundled libraries (`vendor/`):

- [Apache ECharts](https://echarts.apache.org) - Apache-2.0, © The Apache Software Foundation
- [ECharts GL](https://github.com/ecomfe/echarts-gl) - BSD-3-Clause, © 2017 Baidu Inc.
- [three.js](https://threejs.org) - MIT, © 2010-2022 three.js authors
