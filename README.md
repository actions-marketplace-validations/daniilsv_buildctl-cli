# Build Assistant GitHub Action

GitHub Action для интеграции с Build Assistant - системой отслеживания CI/CD сборок.

## Возможности

- 📊 Отправка событий сборки (started, in_progress, success, failed, cancelled)
- 📦 Загрузка файловых артефактов в S3
- 🐳 Регистрация Docker образов с тегами и дайджестами
- 🔔 Автоматические уведомления в Telegram
- 🤖 AI-анализ коммитов

## Использование

### 1. Отправка события сборки

```yaml
- name: Notify build started
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: event
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    status: started

- name: Notify build success
  if: success()
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: event
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    status: success
    log: "Build completed successfully"

- name: Notify build failed
  if: failure()
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: event
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    status: failed
    log: "Build failed with errors"
```

### 2. Загрузка артефакта

```yaml
- name: Upload artifact
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: artifact
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    file: ./dist/app.tar.gz
```

### 3. Регистрация Docker образа

```yaml
- name: Build and push Docker image
  run: |
    docker build -t registry.example.com/my-project:${{ github.sha }} .
    docker push registry.example.com/my-project:${{ github.sha }}

- name: Get image digest
  id: digest
  run: |
    DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' registry.example.com/my-project:${{ github.sha }} | cut -d'@' -f2)
    echo "digest=$DIGEST" >> $GITHUB_OUTPUT

- name: Register container image
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: container
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    image: registry.example.com/my-project:${{ github.sha }}
    digest: ${{ steps.digest.outputs.digest }}
```

### 4. Регистрация Docker образа с загрузкой tar архива

```yaml
- name: Save Docker image to tar
  run: docker save registry.example.com/my-project:${{ github.sha }} -o image.tar

- name: Register container image with tarball
  uses: daniilsv/buildctl-cli@v1.0.1
  with:
    action: container
    token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
    project: my-project
    image: registry.example.com/my-project:${{ github.sha }}
    digest: ${{ steps.digest.outputs.digest }}
    file: image.tar
```

## Полный пример workflow

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Notify build started
        uses: daniilsv/buildctl-cli@v1.0.1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: started

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Create distribution archive
        run: tar -czf dist.tar.gz -C dist .

      - name: Upload artifact
        if: success()
        uses: daniilsv/buildctl-cli@v1.0.1
        with:
          action: artifact
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          file: dist.tar.gz

      - name: Build Docker image
        if: success()
        run: |
          docker build -t registry.example.com/my-project:${{ github.sha }} .
          docker push registry.example.com/my-project:${{ github.sha }}

      - name: Get image digest
        if: success()
        id: digest
        run: |
          DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' registry.example.com/my-project:${{ github.sha }} | cut -d'@' -f2)
          echo "digest=$DIGEST" >> $GITHUB_OUTPUT

      - name: Register container image
        if: success()
        uses: daniilsv/buildctl-cli@v1.0.1
        with:
          action: container
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          image: registry.example.com/my-project:${{ github.sha }}
          digest: ${{ steps.digest.outputs.digest }}

      - name: Notify build success
        if: success()
        uses: daniilsv/buildctl-cli@v1.0.1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: success

      - name: Notify build failed
        if: failure()
        uses: daniilsv/buildctl-cli@v1.0.1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: failed
```

## Входные параметры

### Общие параметры (обязательные)

| Параметр | Описание | Обязательный |
|----------|----------|--------------|
| `action` | Действие: `event`, `artifact` или `container` | Да |
| `token` | API токен Build Assistant | Да |
| `backend` | URL бэкенда Build Assistant | Да |
| `project` | Имя проекта | Да |
| `branch` | Имя ветки (по умолчанию: `${{ github.ref_name }}`) | Нет |
| `commit` | Хэш коммита (по умолчанию: `${{ github.sha }}`) | Нет |

### Параметры для action=event

| Параметр | Описание | Обязательный |
|----------|----------|--------------|
| `status` | Статус сборки: `queued`, `started`, `in_progress`, `success`, `failed`, `cancelled` | Да |
| `log` | Сообщение лога | Нет |

### Параметры для action=artifact

| Параметр | Описание | Обязательный |
|----------|----------|--------------|
| `file` | Путь к файлу для загрузки | Да |

### Параметры для action=container

| Параметр | Описание | Обязательный |
|----------|----------|--------------|
| `image` | Образ контейнера с тегом (например, `registry.example.com/app:v1.0`) | Да |
| `digest` | Дайджест образа (например, `sha256:abc123...`) | Да |
| `file` | Путь к tar архиву образа (опционально) | Нет |

## Настройка GitHub Secrets

Добавьте следующие секреты в настройках репозитория (Settings → Secrets and variables → Actions):

- `BUILD_ASSISTANT_TOKEN` - API токен, созданный в веб-интерфейсе Build Assistant
- `BUILD_ASSISTANT_BACKEND` - URL бэкенда (например, `https://build-assistant.example.com`)

## Использование в Gitea

Этот action полностью совместим с Gitea Actions. Просто используйте его в своем `.gitea/workflows/*.yml` файле точно так же, как в GitHub Actions.

```yaml
name: Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Notify build started
        uses: your-gitea-org/build-assistant@v1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: started
```
