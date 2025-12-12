if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorMessage = document.getElementById('errorMessage');

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Пароли не совпадают';
            errorMessage.style.display = 'block';
            return;
        }

        if (password.length < 4) {
            errorMessage.textContent = 'Пароль должен содержать минимум 4 символа';
            errorMessage.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                errorMessage.textContent = data.error || 'Ошибка регистрации';
                errorMessage.style.display = 'block';
                return;
            }

            alert('Регистрация успешна! Теперь вы можете войти в систему.');
            window.location.href = '/index.html';
        } catch (error) {
            errorMessage.textContent = 'Ошибка соединения с сервером';
            errorMessage.style.display = 'block';
        }
    });
}

