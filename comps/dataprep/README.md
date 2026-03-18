 # Dataprep Component Setup

Enter into the working directory
```bash
cd research-assistant
```
 
## Dataprep server
 
### Build the Dataprep image
```bash
docker buildx build --build-arg https_proxy=$https_proxy --build-arg http_proxy=$http_proxy -t research-assistant/dataprep:latest -f comps/dataprep/Dockerfile .  
```

## To test and run the service individually
 
#### Run Dataprep container
```bash
docker run -p 1006:6007 -e http_proxy=$http_proxy -e https_proxy=$https_proxy -e HUGGINGFACEHUB_API_TOKEN=<token> -e REDIS_URL=redis://<redis-host-name>:6379 -v /root/.cache/huggingface/hub:/.cache/huggingface/hub research-assistant/dataprep:latest
```
 
#### Run the redis vector db

```bash
docker run -p 6379:6379 -p 8001:8001 redis/redis-stack:7.2.0-v9
```

## To upload pdf

```bash
curl -X POST "http://localhost:1006/v1/dataprep" \
-H "Content-Type: multipart/form-data" \
-F "files=@research-assistant/assets/selected_file.pdf"
# Replace with the path to your pdf
```