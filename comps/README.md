# Backend 


## Setup


### Build image
```bash
cd research-assistant;
docker buildx build --build-arg https_proxy=$https_proxy --build-arg http_proxy=$http_proxy -t ai-agents/rag/backend:latest -f comps/Dockerfile .; 
```

### Run container

```bash
docker run -p 5008:5008 -e no_proxy=$no_proxy -e http_proxy=$http_proxy -e https_proxy=$https_proxy -e MEGA_SERVICE_PORT=5008 -e EMBEDDING_SERVER_HOST_IP=tei-embedding-service -e EMBEDDING_SERVER_PORT=6006 -e RETRIEVER_SERVICE_HOST_IP=retriever -e RETRIEVER_SERVICE_PORT=5010 -e RERANK_SERVER_HOST_IP=tei-reranking-service -e RERANK_SERVER_PORT=8808 -e LLM_SERVER_HOST_IP=vllm-service -e LLM_SERVER_PORT=9009 research-assistant/rag/backend:latest
```
