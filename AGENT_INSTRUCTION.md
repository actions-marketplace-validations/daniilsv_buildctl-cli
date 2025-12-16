# Инструкция для LLM-agent: Добавление шагов сборки в CI/CD workflow

## Обзор

Эта инструкция описывает, как LLM-agent должен добавлять шаги сборки в GitHub Actions/Gitea Actions workflow файлы, используя GitHub Action `daniilsv/buildctl-cli@v2.0.1` для интеграции с Build Assistant.

## Структура шагов

### 1. Отправка событий сборки (action: event)

#### 1.1. Уведомление о начале сборки

**Размещение**: В начале job, сразу после `checkout`

**Шаблон**:
```yaml
- name: Notify build started
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: event
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    status: started
```

**Обязательные параметры**:
- `action: event`
- `token`: токен API (обычно из `${{ env.BUILD_ASSISTANT_TOKEN }}` или `${{ secrets.BUILD_ASSISTANT_TOKEN }}`)
- `backend`: URL бэкенда (обычно из `${{ env.BUILD_ASSISTANT_BACKEND }}` или `${{ secrets.BUILD_ASSISTANT_BACKEND }}`)
- `project`: имя проекта (обычно из `${{ env.PROJECT_NAME }}` или прямое значение)
- `status: started`

**Опциональные параметры**:
- `branch`: имя ветки (по умолчанию `${{ github.ref_name }}`)
- `commit`: хэш коммита (по умолчанию `${{ github.sha }}`)
- `log`: сообщение лога

#### 1.2. Уведомление о прогрессе сборки (in_progress)

**Размещение**: После выполнения важных этапов сборки (компиляция, тесты, сборка образа и т.д.)

**Шаблон**:
```yaml
- name: Send log
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: event
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    status: in_progress
    log: "Описание выполненного этапа"
```

**Обязательные параметры**: те же, что для `started`, но `status: in_progress`
**Рекомендуется**: всегда указывать `log` с описанием выполненного этапа

**Примеры сообщений для log**:
- `"Built backend image"`
- `"Tests completed successfully"`
- `"Application compiled"`
- `"Docker image pushed to registry"`

#### 1.3. Уведомление об успешном завершении

**Размещение**: В конце job, после всех успешных шагов

**Шаблон**:
```yaml
- name: Notify build success
  if: success()
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: event
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    status: success
    log: "Build completed successfully"
```

**Обязательные параметры**: те же, но `status: success`
**Обязательное условие**: `if: success()` - шаг выполняется только при успешном завершении всех предыдущих шагов
**Рекомендуется**: указывать `log` с итоговым сообщением

#### 1.4. Уведомление об ошибке

**Размещение**: В конце job, после всех шагов

**Шаблон**:
```yaml
- name: Notify build failed
  if: failure()
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: event
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    status: failed
    log: "Build failed with errors"
```

**Обязательные параметры**: те же, но `status: failed`
**Обязательное условие**: `if: failure()` - шаг выполняется только при ошибке в предыдущих шагах
**Рекомендуется**: указывать `log` с описанием ошибки

### 2. Загрузка артефактов (action: artifact)

#### 2.1. Базовая загрузка файла

**Размещение**: После создания файла/архива, который нужно загрузить

**Шаблон**:
```yaml
- name: Upload artifact
  if: success()
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: artifact
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    file: ./path/to/file
```

**Обязательные параметры**:
- `action: artifact`
- `token`, `backend`, `project` (как в event)
- `file`: путь к файлу для загрузки (относительно корня репозитория)

**Рекомендуется**: добавлять `if: success()` чтобы загружать только при успешной сборке

**Примеры путей**:
- `./dist/app.tar.gz`
- `./build/package.zip`
- `./README.md`
- `./target/app.jar`

#### 2.2. Загрузка после создания архива

**Типичный паттерн**:
```yaml
- name: Create distribution archive
  run: tar -czf dist.tar.gz -C dist .

- name: Upload artifact
  if: success()
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: artifact
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    file: dist.tar.gz
```

### 3. Регистрация Docker образов (action: container)

#### 3.1. Регистрация образа без tar архива

**Размещение**: После сборки и push образа в registry, после получения digest

**Шаблон**:
```yaml
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
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: container
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    image: registry.example.com/my-project:${{ github.sha }}
    digest: ${{ steps.digest.outputs.digest }}
```

**Обязательные параметры**:
- `action: container`
- `token`, `backend`, `project` (как в event)
- `image`: полное имя образа с тегом (например, `registry.example.com/app:v1.0`)
- `digest`: дайджест образа (обычно получается через `docker inspect`)

**Важно**: 
- Digest должен быть получен через отдельный step с `id: digest`
- Использовать `${{ steps.digest.outputs.digest }}` для передачи digest

#### 3.2. Регистрация образа с tar архивом

**Размещение**: После сохранения образа в tar файл

**Шаблон**:
```yaml
- name: Save Docker image to tar
  run: docker save registry.example.com/my-project:${{ github.sha }} -o image.tar

- name: Register container image with tarball
  if: success()
  uses: daniilsv/buildctl-cli@v2.0.1
  with:
    action: container
    token: ${{ env.BUILD_ASSISTANT_TOKEN }}
    backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
    project: ${{ env.PROJECT_NAME }}
    image: registry.example.com/my-project:${{ github.sha }}
    digest: ${{ steps.digest.outputs.digest }}
    file: image.tar
```

**Дополнительный параметр**:
- `file`: путь к tar архиву образа (опционально, но рекомендуется для сохранения образа)

## Правила размещения шагов

### Порядок шагов в типичном workflow:

1. **Checkout кода**
   ```yaml
   - uses: actions/checkout@v4
   ```

2. **Уведомление о начале сборки** (обязательно)
   ```yaml
   - name: Notify build started
     uses: daniilsv/buildctl-cli@v2.0.1
     with:
       action: event
       status: started
       ...
   ```

3. **Шаги сборки** (тесты, компиляция, сборка и т.д.)

4. **Уведомления о прогрессе** (опционально, после важных этапов)
   ```yaml
   - name: Send log
     uses: daniilsv/buildctl-cli@v2.0.1
     with:
       action: event
       status: in_progress
       log: "..."
       ...
   ```

5. **Создание артефактов** (если нужно)

6. **Загрузка артефактов** (если есть файлы для загрузки)
   ```yaml
   - name: Upload artifact
     if: success()
     uses: daniilsv/buildctl-cli@v2.0.1
     with:
       action: artifact
       file: ...
       ...
   ```

7. **Сборка и push Docker образа** (если используется)

8. **Получение digest образа** (если регистрируется контейнер)

9. **Регистрация контейнера** (если используется)
   ```yaml
   - name: Register container image
     if: success()
     uses: daniilsv/buildctl-cli@v2.0.1
     with:
       action: container
       image: ...
       digest: ...
       ...
   ```

10. **Уведомление об успехе** (обязательно, в конце)
    ```yaml
    - name: Notify build success
      if: success()
      uses: daniilsv/buildctl-cli@v2.0.1
      with:
        action: event
        status: success
        ...
    ```

11. **Уведомление об ошибке** (обязательно, в конце)
    ```yaml
    - name: Notify build failed
      if: failure()
      uses: daniilsv/buildctl-cli@v2.0.1
      with:
        action: event
        status: failed
        ...
    ```

## Использование переменных окружения

### Рекомендуемый подход (как в ci-cd.yml):

Определить переменные в секции `env` на уровне workflow:

```yaml
env:
  BUILD_ASSISTANT_TOKEN: ${{ vars.BUILDCTL_TOKEN }}
  BUILD_ASSISTANT_BACKEND: ${{ vars.BUILDCTL_BACKEND }}
  PROJECT_NAME: ${{ vars.BUILDCTL_PROJECT }}
```

Затем использовать в шагах:
```yaml
token: ${{ env.BUILD_ASSISTANT_TOKEN }}
backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
project: ${{ env.PROJECT_NAME }}
```

### Альтернативный подход (как в README):

Использовать secrets напрямую:
```yaml
token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
project: my-project
```

**Рекомендация**: Использовать первый подход (через `env`) для единообразия и удобства управления.

## Условия выполнения шагов

### Обязательные условия:

- **Успешные шаги** (загрузка артефактов, регистрация контейнеров, уведомление об успехе):
  ```yaml
  if: success()
  ```

- **Шаги при ошибке** (уведомление об ошибке):
  ```yaml
  if: failure()
  ```

- **Шаги всегда** (уведомление о начале, логи прогресса):
  Без условия `if`, выполняются всегда

## Статусы для action=event

Допустимые значения `status`:
- `queued` - сборка в очереди
- `started` - сборка началась
- `in_progress` - сборка в процессе (с логом)
- `success` - сборка успешна
- `failed` - сборка провалилась
- `cancelled` - сборка отменена

## Примеры полных workflow

### Минимальный workflow:

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BUILD_ASSISTANT_TOKEN: ${{ vars.BUILDCTL_TOKEN }}
      BUILD_ASSISTANT_BACKEND: ${{ vars.BUILDCTL_BACKEND }}
      PROJECT_NAME: ${{ vars.BUILDCTL_PROJECT }}
    steps:
      - uses: actions/checkout@v4

      - name: Notify build started
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: started

      - name: Build
        run: echo "Building..."

      - name: Notify build success
        if: success()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: success

      - name: Notify build failed
        if: failure()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: failed
```

### Workflow с артефактами:

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BUILD_ASSISTANT_TOKEN: ${{ vars.BUILDCTL_TOKEN }}
      BUILD_ASSISTANT_BACKEND: ${{ vars.BUILDCTL_BACKEND }}
      PROJECT_NAME: ${{ vars.BUILDCTL_PROJECT }}
    steps:
      - uses: actions/checkout@v4

      - name: Notify build started
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: started

      - name: Build application
        run: npm run build

      - name: Create archive
        run: tar -czf dist.tar.gz -C dist .

      - name: Upload artifact
        if: success()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: artifact
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          file: dist.tar.gz

      - name: Notify build success
        if: success()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: success

      - name: Notify build failed
        if: failure()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: failed
```

### Workflow с Docker контейнером:

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      BUILD_ASSISTANT_TOKEN: ${{ vars.BUILDCTL_TOKEN }}
      BUILD_ASSISTANT_BACKEND: ${{ vars.BUILDCTL_BACKEND }}
      PROJECT_NAME: ${{ vars.BUILDCTL_PROJECT }}
    steps:
      - uses: actions/checkout@v4

      - name: Notify build started
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: started

      - name: Build Docker image
        run: |
          docker build -t registry.example.com/my-project:${{ github.sha }} .
          docker push registry.example.com/my-project:${{ github.sha }}

      - name: Get image digest
        id: digest
        run: |
          DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' registry.example.com/my-project:${{ github.sha }} | cut -d'@' -f2)
          echo "digest=$DIGEST" >> $GITHUB_OUTPUT

      - name: Register container image
        if: success()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: container
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          image: registry.example.com/my-project:${{ github.sha }}
          digest: ${{ steps.digest.outputs.digest }}

      - name: Notify build success
        if: success()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: success

      - name: Notify build failed
        if: failure()
        uses: daniilsv/buildctl-cli@v2.0.1
        with:
          action: event
          token: ${{ env.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ env.BUILD_ASSISTANT_BACKEND }}
          project: ${{ env.PROJECT_NAME }}
          status: failed
```

## Чек-лист для LLM-agent

При добавлении шагов сборки убедись:

- [ ] Добавлен шаг "Notify build started" в начале job (после checkout)
- [ ] Добавлен шаг "Notify build success" в конце job с условием `if: success()`
- [ ] Добавлен шаг "Notify build failed" в конце job с условием `if: failure()`
- [ ] Все шаги используют правильные параметры (`token`, `backend`, `project`)
- [ ] Для загрузки артефактов добавлен `if: success()`
- [ ] Для регистрации контейнеров добавлен `if: success()`
- [ ] Digest для контейнеров получается через отдельный step с `id: digest`
- [ ] Используется правильный формат для `image` (полное имя с тегом)
- [ ] Логи прогресса (`in_progress`) имеют осмысленные сообщения в `log`
- [ ] Переменные окружения определены в секции `env` (если используется этот подход)

## Важные замечания

1. **Всегда добавляй три обязательных шага**: `started`, `success` (с `if: success()`), `failed` (с `if: failure()`)

2. **Шаги с условиями должны быть в конце job**: `success` и `failed` должны быть последними шагами

3. **Используй единый стиль переменных**: если в workflow уже используется `env`, продолжай использовать `env`, если `secrets` - используй `secrets`

4. **Проверяй существующие шаги**: если в workflow уже есть шаги buildctl-cli, следуй их стилю

5. **Digest обязателен для контейнеров**: без digest регистрация контейнера не будет работать

6. **Путь к файлу относительный**: путь в `file` должен быть относительно корня репозитория

7. **Версия action**: всегда используй `daniilsv/buildctl-cli@v2.0.1` (или актуальную версию, если указана в существующем workflow)

