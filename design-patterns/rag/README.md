# AI Agents


## Setup

1. Clone repo
```bash
https://github.com/navchetna/research-assistant
```
2. Move to project repo
```bash
cd research-assistant/design-patterns/rag;
```

### Docker setup

#### Build image

```bash
export SERVER_HOST_URL=<host>:<port> # localhost:5008
docker buildx build --build-arg https_proxy=$https_proxy --build-arg http_proxy=$http_proxy --build-arg SERVER_URL=${SERVER_HOST_URL} -t research-assistant/rag/ui:latest -f install/docker/Dockerfile .;
```

> Note: host would be localhost for local dev or server hostname for remote server

#### Run container

```
docker run -p 5009:3000 -e http_proxy=$http_proxy -e https_proxy=$https_proxy research-assistant/rag/ui:latest
```

### Local Setup

1. Install dependencies
```
make build-ui;
```
2. Start UI server
```
make ui;
```

> Note
> Please make sure to use WSL/Linux environment for running above
