# bge-small-zh-v1.5 browser assets

This directory contains the quantized ONNX browser distribution of
`BAAI/bge-small-zh-v1.5` used by the knowledge-base Embedding Top-K lab.

- Model source: `AI-ModelScope/bge-small-zh-v1.5`
- Model license: MIT, included in `LICENSE`
- Runtime: `@huggingface/transformers@3.7.2`
- Pooling: CLS
- Output dimension: 512

The browser lab loads these files from the same deployment origin and does not send
article queries to an external inference API.
