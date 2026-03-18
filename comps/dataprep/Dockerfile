# Copyright (C) 2024 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

FROM python:3.11-slim

ENV LANG=C.UTF-8

ARG ARCH="cpu"

RUN apt-get update -y && apt-get install -y --no-install-recommends --fix-missing \
    build-essential \
    default-jre \
    libjemalloc-dev \
    libreoffice \
    poppler-utils \
    tesseract-ocr \
    libtcmalloc-minimal4

RUN useradd -m -s /bin/bash user && \
    mkdir -p /home/user && \
    chown -R user /home/user/

USER user

COPY comps /home/user/comps

RUN pip install torch==2.9.0 torchvision==0.24.0 --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir --upgrade pip setuptools && \
    if [ ${ARCH} = "cpu" ]; then pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu; fi && \
    pip install --no-cache-dir -r /home/user/comps/dataprep/requirements.txt

USER root

RUN mkdir -p /home/user/comps/dataprep/uploaded_files && chown -R user /home/user/comps/dataprep/uploaded_files
RUN mkdir -p /home/user/comps/dataprep/out && chown -R user /home/user/comps/dataprep/out
RUN mkdir -p /home/user/comps/parsers/ncert_toc && chown -R user /home/user/comps/parsers/ncert_toc

ENV PYTHONPATH=/home/user

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libtcmalloc_minimal.so.4

USER user

WORKDIR /home/user/comps/dataprep

ENTRYPOINT ["python", "prepare_doc_redis.py"]
