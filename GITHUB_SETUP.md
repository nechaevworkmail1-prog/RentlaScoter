# Инструкция по загрузке проекта на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Перейдите на https://github.com
2. Нажмите кнопку "+" в правом верхнем углу
3. Выберите "New repository"
4. Введите название репозитория (например: `accountant-bot`)
5. НЕ добавляйте README, .gitignore или лицензию (они уже есть)
6. Нажмите "Create repository"

## Шаг 2: Добавьте удаленный репозиторий

После создания репозитория GitHub покажет вам URL. Выполните команды:

```bash
git remote add origin https://github.com/ВАШ-USERNAME/accountant-bot.git
git branch -M main
git push -u origin main
```

Замените `ВАШ-USERNAME` на ваш GitHub username.

## Альтернативный способ (если используете SSH):

```bash
git remote add origin git@github.com:ВАШ-USERNAME/accountant-bot.git
git branch -M main
git push -u origin main
```

## После выполнения команд

Проект будет доступен на GitHub по адресу:
`https://github.com/ВАШ-USERNAME/accountant-bot`

