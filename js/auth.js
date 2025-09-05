document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-message');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', handleLogin);
    
    // Add real-time validation
    const identifierInput = form.identifier;
    const passwordInput = form.password;
    
    identifierInput.addEventListener('input', clearErrorOnInput);
    passwordInput.addEventListener('input', clearErrorOnInput);

    async function handleLogin(e) {
        e.preventDefault();

        const identifier = form.identifier.value.trim();
        const password = form.password.value;

        // Clear previous errors
        hideError();

        // Validation
        if (!validateInputs(identifier, password)) {
            return;
        }

        // Show loading state
        setLoadingState(true);

        try {
            // Create credentials
            const credentials = btoa(`${identifier}:${password}`);

            const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMessage = 'Login failed';
                
                try {
                    const errorData = await response.text();
                    // Try to parse as JSON first
                    try {
                        const jsonError = JSON.parse(errorData);
                        errorMessage = jsonError.message || jsonError.error || errorMessage;
                    } catch {
                        // If not JSON, use the text response
                        errorMessage = errorData || errorMessage;
                    }
                } catch {
                    // Fallback error messages based on status
                    switch (response.status) {
                        case 401:
                            errorMessage = 'Invalid username/email or password';
                            break;
                        case 403:
                            errorMessage = 'Access denied';
                            break;
                        case 404:
                            errorMessage = 'User not found';
                            break;
                        case 429:
                            errorMessage = 'Too many login attempts. Please try again later';
                            break;
                        case 500:
                            errorMessage = 'Server error. Please try again later';
                            break;
                        default:
                            errorMessage = `Login failed (${response.status})`;
                    }
                }
                
                throw new Error(errorMessage);
            }

            // Get the token
            const token = await response.text();
            const cleanToken = token.trim().replace(/^"|"$/g, '');

            if (!cleanToken || cleanToken.length < 10) {
                throw new Error('Invalid token received from server');
            }

            // Store token
            localStorage.setItem('jwt', cleanToken);
            
            // Show success state briefly
            setSuccessState();
            
            // Redirect after a brief delay
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 800);

        } catch (err) {
            showError(err.message);
            setLoadingState(false);
        }
    }

    function validateInputs(identifier, password) {
        if (!identifier) {
            showError('Please enter your username or email');
            form.identifier.focus();
            return false;
        }

        if (!password) {
            showError('Please enter your password');
            form.password.focus();
            return false;
        }

        if (identifier.length < 2) {
            showError('Username/email must be at least 2 characters long');
            form.identifier.focus();
            return false;
        }

        if (password.length < 3) {
            showError('Password must be at least 3 characters long');
            form.password.focus();
            return false;
        }

        // Basic email validation if it contains @
        if (identifier.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(identifier)) {
                showError('Please enter a valid email address');
                form.identifier.focus();
                return false;
            }
        }

        return true;
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            submitBtn.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
            form.identifier.disabled = true;
            form.password.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
            submitBtn.style.background = 'linear-gradient(135deg, #3b82f6, #06b6d4)';
            form.identifier.disabled = false;
            form.password.disabled = false;
        }
    }

    function setSuccessState() {
        submitBtn.textContent = '✅ Success!';
        submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        errorMsg.style.animation = 'none';
        // Trigger reflow and add animation
        errorMsg.offsetHeight;
        errorMsg.style.animation = 'fadeIn 0.3s ease-out';
    }

    function hideError() {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }

    function clearErrorOnInput() {
        if (errorMsg.style.display === 'block') {
            hideError();
        }
    }

    // Add CSS for fade in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Check if already logged in
    const existingToken = localStorage.getItem('jwt');
    if (existingToken) {
        window.location.href = 'profile.html';
    }
});