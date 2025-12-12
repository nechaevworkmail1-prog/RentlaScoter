function saveToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function removeToken() {
    localStorage.removeItem('token');
}

async function checkAuth() {
    const token = getToken();
    if (!token) {
        if (window.location.pathname !== '/index.html' && 
            window.location.pathname !== '/' && 
            window.location.pathname !== '/register.html') {
            window.location.href = '/index.html';
        }
        return false;
    }
    
    if (window.location.pathname === '/register.html' && !token) {
        return false;
    }

    try {
        const response = await fetch('http://localhost:3000/api/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            removeToken();
            if (window.location.pathname !== '/index.html' && 
                window.location.pathname !== '/' && 
                window.location.pathname !== '/register.html') {
                window.location.href = '/index.html';
            }
            return false;
        }

        const user = await response.json();
        
        if (window.location.pathname === '/index.html' || window.location.pathname === '/' || window.location.pathname === '/register.html') {
            if (user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/user.html';
            }
            return user;
        }
        
        if (window.location.pathname === '/admin.html' && user.role !== 'admin') {
            window.location.href = '/user.html';
        }
        
        if (window.location.pathname === '/user.html' && user.role === 'admin') {
            window.location.href = '/admin.html';
        }

        return user;
    } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        removeToken();
        if (window.location.pathname !== '/index.html' && 
            window.location.pathname !== '/' && 
            window.location.pathname !== '/register.html') {
            window.location.href = '/index.html';
        }
        return false;
    }
}

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Ошибка парсинга ответа:', parseError);
                errorMessage.textContent = 'Ошибка обработки ответа сервера';
                errorMessage.style.display = 'block';
                return;
            }

            if (!response.ok) {
                errorMessage.textContent = data.error || 'Ошибка входа';
                errorMessage.style.display = 'block';
                return;
            }

            if (!data || !data.token) {
                errorMessage.textContent = 'Неверный ответ от сервера';
                errorMessage.style.display = 'block';
                return;
            }

            saveToken(data.token);
            
            console.log('Вход успешен, токен сохранен:', data.token ? 'да' : 'нет');
            console.log('Данные пользователя:', data.user);

            if (data.user && data.user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/user.html';
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            errorMessage.textContent = 'Ошибка соединения с сервером: ' + error.message;
            errorMessage.style.display = 'block';
        }
    });
}

if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        removeToken();
        window.location.href = '/index.html';
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname === '/index.html' || window.location.pathname === '/' || window.location.pathname === '/register.html') {
        const token = getToken();
        if (token) {
            const user = await checkAuth();
        }
    } else {
        const user = await checkAuth();
        if (user && document.getElementById('userInfo')) {
            document.getElementById('userInfo').textContent = `Пользователь: ${user.username}`;
        }
    }
});

