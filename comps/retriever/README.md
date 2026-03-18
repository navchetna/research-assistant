# Retriever Component Setup
 
Enter into the working directory
```bash
cd research-assistant
``` 
## Retriever server
 
### Build Retriever image
```bash
docker buildx build --build-arg https_proxy=$https_proxy --build-arg http_proxy=$http_proxy -t research-assistant/retriever:latest -f comps/retriever/Dockerfile . 
``` 

## To test and run the service individually
### Run Retriever container
```bash
docker run -p 5007:7000 -e http_proxy=$http_proxy -e https_proxy=$https_proxy -e HUGGINGFACEHUB_API_TOKEN=<token> -e REDIS_URL=redis://<redis-host-name>:6379 -v /root/.cache/huggingface/hub:/.cache/huggingface/hub research-assistant/retriever:latest
``` 
 
### Run the Redis vector DB

```bash
docker run -p 6379:6379 -p 8001:8001 redis/redis-stack:7.2.0-v9
```

## To check retrieval

```bash
export your_embedding=$(python3 -c "import random; embedding = [random.uniform(-1, 1) for _ in range(768)]; print(embedding)")
curl http://localhost:5007/v1/retrieval \
  -X POST \
  -d "{\"text\":\"test\",\"embedding\":${your_embedding}}" \
  -H 'Content-Type: application/json'
```

> Note: for localsetup use *"localhost"* as host_ip
