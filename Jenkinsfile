// continuous integration pipeline, every build starts from an empty workspace
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
    JEST_JUNIT_OUTPUT_DIR = "${env.WORKSPACE}/reports/junit"
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'node --version && npm --version'
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run check'
      }
    }

    stage('Unit tests') {
      steps {
        sh 'JEST_JUNIT_OUTPUT_NAME=backend-unit.xml npm --prefix backend run test:unit -- --ci --reporters=default --reporters=jest-junit'
        sh 'npm --prefix frontend run test -- --reporter=default --reporter=junit --outputFile.junit="$JEST_JUNIT_OUTPUT_DIR/frontend-unit.xml"'
      }
    }

    stage('Integration tests') {
      steps {
        sh 'JEST_JUNIT_OUTPUT_NAME=backend-integration.xml npm --prefix backend run test:integration -- --ci --reporters=default --reporters=jest-junit'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'reports/junit/*.xml'
    }
  }
}
