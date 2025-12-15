# Публикация Build Assistant Action для Gitea

Это руководство описывает, как опубликовать и использовать Build Assistant Action в Gitea.

## Структура проекта

После создания action, в корне репозитория должны быть следующие файлы:

```
build_assistant/
├── action.yml           # Описание action
├── Dockerfile           # Образ для запуска action
├── entrypoint.sh        # Скрипт-обёртка для buildctl
├── ACTION_README.md     # Документация по использованию
├── cli/                 # CLI инструмент buildctl
├── back/                # Backend
├── front/               # Frontend
└── ...
```

## Способы публикации для Gitea

### Вариант 1: Публикация в отдельном репозитории (рекомендуется)

Это самый чистый способ - создать отдельный репозиторий только для action.

#### Шаг 1: Создайте новый репозиторий в Gitea

```bash
# В Gitea UI создайте новый репозиторий, например:
# https://git.example.com/your-org/build-assistant-action
```

#### Шаг 2: Подготовьте файлы action

```bash
# Создайте временную директорию для action
mkdir -p /tmp/build-assistant-action
cd /tmp/build-assistant-action

# Скопируйте необходимые файлы из основного репозитория
cp /path/to/build_assistant/action.yml .
cp /path/to/build_assistant/Dockerfile .
cp /path/to/build_assistant/entrypoint.sh .
cp /path/to/build_assistant/ACTION_README.md README.md

# Скопируйте CLI код
cp -r /path/to/build_assistant/cli .
```

#### Шаг 3: Инициализируйте git и отправьте в Gitea

```bash
git init
git add .
git commit -m "Initial commit: Build Assistant Action v1.0.0"

# Добавьте remote
git remote add origin https://git.example.com/your-org/build-assistant-action.git

# Отправьте код
git push -u origin main
```

#### Шаг 4: Создайте тег версии

```bash
git tag -a v1 -m "Version 1.0.0"
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1 v1.0.0
```

**Важно:** Gitea Actions использует теги для версионирования. Обычно создают:
- Major версию: `v1`, `v2` (будет автоматически указывать на последний патч)
- Полную версию: `v1.0.0`, `v1.0.1`, etc.

#### Шаг 5: Используйте action в workflow

Теперь в любом репозитории на вашем Gitea можно использовать:

```yaml
# .gitea/workflows/build.yml
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
        uses: your-org/build-assistant-action@v1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: started
```

### Вариант 2: Использование из основного репозитория

Если вы хотите использовать action прямо из основного репозитория build_assistant:

#### Шаг 1: Создайте тег версии

```bash
cd /path/to/build_assistant

git tag -a action-v1 -m "Build Assistant Action v1.0.0"
git tag -a action-v1.0.0 -m "Build Assistant Action v1.0.0"
git push origin action-v1 action-v1.0.0
```

#### Шаг 2: Используйте action в workflow

```yaml
# .gitea/workflows/build.yml
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
        uses: your-org/build_assistant@action-v1
        with:
          action: event
          token: ${{ secrets.BUILD_ASSISTANT_TOKEN }}
          backend: ${{ secrets.BUILD_ASSISTANT_BACKEND }}
          project: my-project
          status: started
```

**Примечание:** В этом случае будет клонирован весь репозиторий, включая backend и frontend код, что может быть избыточно.

### Вариант 3: Использование через конкретный commit/SHA

Вы можете ссылаться на конкретный коммит:

```yaml
- uses: your-org/build-assistant-action@abc123def456
```

Это полезно для строгого контроля версий и воспроизводимости сборок.

## Настройка Gitea Runner

Убедитесь, что на вашем Gitea сервере настроен и запущен Gitea Runner:

### Установка Gitea Runner

```bash
# Скачайте act_runner
wget https://dl.gitea.com/act_runner/latest/act_runner-linux-amd64
chmod +x act_runner-linux-amd64
sudo mv act_runner-linux-amd64 /usr/local/bin/act_runner

# Зарегистрируйте runner
act_runner register --no-interactive \
  --instance https://git.example.com \
  --token YOUR_REGISTRATION_TOKEN \
  --name runner-1

# Запустите runner как сервис
sudo cat > /etc/systemd/system/act_runner.service <<EOF
[Unit]
Description=Gitea Actions Runner
After=network.target

[Service]
Type=simple
User=gitea
WorkingDirectory=/var/lib/gitea
ExecStart=/usr/local/bin/act_runner daemon
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable act_runner
sudo systemctl start act_runner
```

### Требования к Runner

Для работы Build Assistant Action runner должен:
- Иметь доступ к Docker (action использует Docker для запуска)
- Иметь сетевой доступ к Build Assistant backend
- Иметь доступ к S3 для загрузки артефактов

## Обновление action

### При использовании отдельного репозитория

```bash
cd /path/to/build-assistant-action

# Внесите изменения в файлы
# ...

git add .
git commit -m "feat: add new feature"
git push

# Создайте новый тег
git tag -a v1.1.0 -m "Version 1.1.0"
git push origin v1.1.0

# Обновите major тег (опционально)
git tag -f -a v1 -m "Version 1.1.0"
git push -f origin v1
```

### При использовании основного репозитория

```bash
cd /path/to/build_assistant

# Внесите изменения в action файлы
# ...

git add .
git commit -m "feat: update action"
git push

# Создайте новый тег
git tag -a action-v1.1.0 -m "Build Assistant Action v1.1.0"
git push origin action-v1.1.0

# Обновите major тег (опционально)
git tag -f -a action-v1 -m "Build Assistant Action v1.1.0"
git push -f origin action-v1
```

## Лучшие практики

1. **Используйте отдельный репозиторий для action** - это упрощает использование и ускоряет клонирование

2. **Семантическое версионирование** - следуйте semver:
   - `v1.0.0` - первая стабильная версия
   - `v1.0.1` - исправление ошибок (patch)
   - `v1.1.0` - новая функциональность (minor)
   - `v2.0.0` - несовместимые изменения (major)

3. **Major теги** - создавайте major теги (`v1`, `v2`) для удобства:
   ```bash
   git tag -f -a v1 -m "Latest v1.x.x"
   git push -f origin v1
   ```

4. **CHANGELOG** - ведите CHANGELOG.md с описанием изменений в каждой версии

5. **Тестирование** - перед публикацией тестируйте action в тестовом репозитории

6. **Документация** - поддерживайте актуальный README.md с примерами использования

## Пример полного цикла публикации

```bash
#!/bin/bash
# publish-action.sh - скрипт для публикации action

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "Usage: ./publish-action.sh v1.0.0"
  exit 1
fi

# Проверка, что это правильный формат версии
if ! [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version must be in format vX.Y.Z (e.g., v1.0.0)"
  exit 1
fi

# Извлечение major версии
MAJOR_VERSION=$(echo "$VERSION" | cut -d. -f1)

echo "Publishing Build Assistant Action $VERSION (major: $MAJOR_VERSION)"

# Проверка на чистое состояние git
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Git working directory is not clean"
  exit 1
fi

# Создание тега
git tag -a "$VERSION" -m "Build Assistant Action $VERSION"
git push origin "$VERSION"

# Обновление major тега
git tag -f -a "$MAJOR_VERSION" -m "Build Assistant Action $VERSION"
git push -f origin "$MAJOR_VERSION"

echo "Successfully published $VERSION"
echo "Users can now use:"
echo "  uses: your-org/build-assistant-action@$VERSION"
echo "  uses: your-org/build-assistant-action@$MAJOR_VERSION"
```

Использование:

```bash
chmod +x publish-action.sh
./publish-action.sh v1.0.0
```

## Troubleshooting

### Action не находится

**Проблема:** `Error: Unable to resolve action`

**Решения:**
1. Проверьте правильность имени репозитория и организации
2. Убедитесь, что репозиторий публичный или runner имеет доступ к приватному репозиторию
3. Проверьте, что тег существует: `git ls-remote --tags https://git.example.com/your-org/build-assistant-action.git`

### Docker build fails

**Проблема:** Ошибка при сборке Docker образа

**Решения:**
1. Проверьте, что Dockerfile корректный
2. Убедитесь, что все необходимые файлы присутствуют в репозитории
3. Проверьте логи runner: `journalctl -u act_runner -f`

### Token/Backend не передаются

**Проблема:** Action получает пустые значения

**Решения:**
1. Проверьте, что secrets добавлены в настройках репозитория
2. Убедитесь, что синтаксис `${{ secrets.SECRET_NAME }}` корректен
3. Проверьте, что secrets доступны для workflow (не все secrets доступны для pull requests из форков)

## Дополнительная информация

- [Gitea Actions Documentation](https://docs.gitea.com/next/usage/actions/overview)
- [GitHub Actions Documentation](https://docs.github.com/en/actions) (для справки, синтаксис совместим)
- [Docker Actions](https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action)
