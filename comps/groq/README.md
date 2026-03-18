# Groq for LLM service


## Setup


### Build image
```bash
cd research-assistant;
docker buildx build --build-arg https_proxy=$https_proxy --build-arg http_proxy=$http_proxy -t research-assistant/groq:latest -f comps/groq/Dockerfile  .;
```

### Run container

```bash
docker run -p 5099:8000 -e GROQ_API_KEY=$your_groq_api_key -e http_proxy=$http_proxy -e https_proxy=$https_proxy research-assistant/groq:latest
```

