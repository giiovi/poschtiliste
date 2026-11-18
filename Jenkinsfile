// continuous integration pipeline, every build starts from an empty workspace

// runs a command in a new container of the test image, then copies its junit reports into the workspace and removes it
def runInTestContainer(String name, String command) {
  try {
    sh "docker run --name \"\$CI_TAG-${name}\" --env JEST_JUNIT_OUTPUT_DIR=/app/reports/junit \"poschtiliste-test:\$CI_TAG\" sh -c '${command}'"
  } finally {
    sh "mkdir -p reports/junit && docker cp \"\$CI_TAG-${name}:/app/reports/junit/.\" reports/junit/ || true"
    sh "docker rm --force \"\$CI_TAG-${name}\" || true"
  }
}

pipeline {
  agent any

  tools {
    // nodejs plugin installation, see "Continuous integration (Jenkins)" in the readme
    nodejs 'node-24'
  }

  options {
    skipDefaultCheckout()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 30, unit: 'MINUTES')
  }

  environment {
    CI = 'true'
    // git hooks are only needed on developer machines
    HUSKY = '0'
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
        script {
          // unique image and container names per job and build, docker allows only some characters
          env.CI_TAG = env.BUILD_TAG.replaceAll('[^A-Za-z0-9_.-]', '-').toLowerCase()
        }
      }
    }

    stage('Install') {
      steps {
        sh 'node --version && npm --version && docker --version'
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run check'
      }
    }

    stage('Docker build') {
      steps {
        sh 'docker build --target test --tag "poschtiliste-test:$CI_TAG" .'
        sh 'docker build --tag "poschtiliste:$CI_TAG" .'
      }
    }

    stage('Unit tests') {
      steps {
        script {
          runInTestContainer('backend-unit', 'JEST_JUNIT_OUTPUT_NAME=backend-unit.xml npm --prefix backend run test:unit -- --ci --reporters=default --reporters=jest-junit')
          runInTestContainer('frontend-unit', 'npm --prefix frontend run test -- --reporter=default --reporter=junit --outputFile.junit=/app/reports/junit/frontend-unit.xml')
        }
      }
    }

    stage('Integration tests') {
      steps {
        script {
          runInTestContainer('integration', 'JEST_JUNIT_OUTPUT_NAME=backend-integration.xml npm --prefix backend run test:integration -- --ci --reporters=default --reporters=jest-junit')
        }
      }
    }

    stage('Smoke test') {
      steps {
        sh '''
          docker run --detach --name "$CI_TAG-smoke" --env SESSION_SECRET=jenkins-smoke-test "poschtiliste:$CI_TAG"
          for attempt in $(seq 1 30); do
            if [ "$(docker inspect --format '{{.State.Running}}' "$CI_TAG-smoke")" != "true" ]; then
              echo "container stopped before the health check succeeded"
              docker logs "$CI_TAG-smoke"
              exit 1
            fi
            if docker exec "$CI_TAG-smoke" node -e "fetch('http://127.0.0.1:3000/api/health').then(async (response) => { console.log(response.status, await response.text()); process.exit(response.ok ? 0 : 1); }).catch(() => process.exit(1))"; then
              exit 0
            fi
            sleep 2
          done
          echo "health check did not succeed within 60 seconds"
          docker logs "$CI_TAG-smoke"
          exit 1
        '''
      }
      post {
        always {
          sh 'docker rm --force "$CI_TAG-smoke" || true'
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'reports/junit/*.xml'
      sh 'docker image rm "poschtiliste:$CI_TAG" "poschtiliste-test:$CI_TAG" || true'
    }
  }
}
