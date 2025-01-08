#!/bin/bash

# Detener procesos que están utilizando los puertos 80 y 8000
echo "Deteniendo procesos que están utilizando los puertos 80 y 8000..."
sudo lsof -i :80 -t | xargs -r sudo kill -9
sudo lsof -i :8000 -t | xargs -r sudo kill -9

echo "Procesos detenidos."
