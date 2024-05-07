#!/bin/bash

# The main directory.
SRS_HOME=/usr/local/oryx
DATA_HOME=/data
IMAGE_URL=docker.io/ossrs/oryx:v${application_version}
echo "SRS_HOME=$SRS_HOME, DATA_HOME=$DATA_HOME, IMAGE_URL=$IMAGE_URL"

# When droplet created, it might fail as:
#   gnutls_handshake() failed: The TLS connection was non-properly terminated.
# so we try to wait for a while and try later.
SOURCE=/tmp/oryx
echo "Install oryx at $SOURCE"
for ((i=0; i<30; i++)); do
  cd $(dirname $SOURCE) && rm -rf oryx &&
  git clone -b release/5.14 --depth 1 https://github.com/ossrs/oryx.git &&
  GIT_DONE=YES
  if [[ $? -eq 0 ]]; then break; fi
  echo "Ignore error and try later..."; sleep 3;
done
if [[ $GIT_DONE != YES ]]; then
  echo "Clone oryx failed"; exit 1;
fi

# Install files to lighthouse directory.
rm -rf ${SRS_HOME}/* && mkdir -p ${SRS_HOME}/mgmt ${DATA_HOME} &&
cp -r ${SOURCE}/usr ${SRS_HOME}/usr &&
cp ${SOURCE}/LICENSE ${SRS_HOME}/LICENSE &&
cp ${SOURCE}/README.md ${SRS_HOME}/README.md &&
cp ${SOURCE}/mgmt/bootstrap ${SRS_HOME}/mgmt/bootstrap
if [[ $? -ne 0 ]]; then echo "Copy oryx failed"; exit 1; fi

echo "Start to create data and config files"
mkdir -p ${DATA_HOME}/config && touch ${DATA_HOME}/config/.env
if [[ $? -ne 0 ]]; then echo "Create /data/config failed"; exit 1; fi
echo "Create data and config files ok"

# Setup the nginx configuration.
rm -f /etc/nginx/nginx.conf &&
cp ${SOURCE}/platform/containers/conf/nginx.conf /etc/nginx/nginx.conf &&
sed -i "s/user nginx;/user www-data;/g" /etc/nginx/nginx.conf &&
touch ${DATA_HOME}/config/nginx.http.conf ${DATA_HOME}/config/nginx.server.conf
if [[ $? -ne 0 ]]; then echo "Setup nginx config failed"; exit 1; fi

echo "Start to update bootstrap"
sed -i "s|^DATA_HOME=.*|DATA_HOME=${DATA_HOME}|g" ${SRS_HOME}/mgmt/bootstrap &&
sed -i "s|^IMAGE=.*|IMAGE=${IMAGE_URL}|g" ${SRS_HOME}/mgmt/bootstrap
if [[ $? -ne 0 ]]; then echo "Update bootstrap failed"; exit 1; fi
echo "Update bootstrap ok"

# Choose default language.
echo "Start to setup .env"
if [[ -f ${DATA_HOME}/config/.env && -s ${DATA_HOME}/config/.env ]]; then
    echo "The .env already exists, skip"
else
    cat << END > ${DATA_HOME}/config/.env
CLOUD=DO
REACT_APP_LOCALE=en
IMAGE=${IMAGE_URL}
END
    if [[ $? -ne 0 ]]; then echo "Setup .env failed"; exit 1; fi
fi

# Update the docker images.
echo "Cache docker images" &&
if [[ $(docker images --format "{{.Repository}}:{{.Tag}}" ${IMAGE_URL} |wc -l) -eq 1 ]]; then
    echo "Docker images ${IMAGE_URL} exists, skip pull"
else
    docker pull ${IMAGE_URL}
    if [[ $? -ne 0 ]]; then echo "Cache docker images failed"; exit 1; fi
fi

# Create oryx service, and the credential file.
# Remark: Never start the service, because the IP will change for new machine created.
cd ${SRS_HOME} &&
cp -f usr/lib/systemd/system/oryx.service /usr/lib/systemd/system/oryx.service &&
systemctl daemon-reload && systemctl enable oryx
if [[ $? -ne 0 ]]; then echo "Install oryx failed"; exit 1; fi &&

rm -rf $SOURCE
if [[ $? -ne 0 ]]; then echo "Remove oryx failed"; exit 1; fi

echo 'Install OK'

