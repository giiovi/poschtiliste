# syntax=docker/dockerfile:1

# jenkins controller with the plugins, node.js and the docker cli the jenkinsfile needs
FROM jenkins/jenkins:2.580.2-lts-jdk21

USER root

# node.js 24 from the official image, registered as the nodejs tool node-24 in casc.yaml
COPY --from=node:24-trixie-slim /usr/local/bin/node /opt/node-24/bin/node
COPY --from=node:24-trixie-slim /usr/local/lib/node_modules/npm /opt/node-24/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /opt/node-24/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /opt/node-24/bin/npx

# docker cli with buildx, the builds use the docker daemon of the host through the mounted socket
COPY --from=docker:29-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker:29-cli /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx

COPY --chmod=755 entrypoint.sh /usr/local/bin/poschtiliste-jenkins.sh

USER jenkins

ENV JAVA_OPTS=-Djenkins.install.runSetupWizard=false \
    CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/casc.yaml

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY casc.yaml /usr/share/jenkins/casc/casc.yaml

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/poschtiliste-jenkins.sh"]
