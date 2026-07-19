# Smart Data Importer

A high-density, high-performance industrial ledger data ingestion ecosystem. The application parses arbitrary CSV structures, runs a dynamic Levenshtein-driven header alignment interface, evaluates rows against target schemas, and executes transaction-bounded, high-speed database injections into MySQL with single-row error isolation fallback capabilities.

---

## 🛠️ System Architecture Overview

The system architecture is organized into two isolated processing layers connected via asynchronous network bridges:

```text
  [ Client Browser UI ] ──( Axios REST )──> [ Node.js Express Server ]
           │                                            │
   (Vite React Engine)                          (Line Stream Parser)
           │                                            │
   (Industrial Ledger)                                  ▼
           ▼                            [ High-Speed Batch Inserter ]
   [ Component Layouts ] <──( JSON Stats )──────( Chunk Size: 500 Rows )
                                                        │
                                                        ▼
                                             [ MySQL 8.0 Storage Database ]
                                              ├── customers table
                                              └── import_errors log table