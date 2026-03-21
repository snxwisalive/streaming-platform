const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/** Base URL for static uploads (avatars, etc.) - no /api */
export const getUploadsBaseUrl = () => (API_BASE_URL || '').replace(/\/api\/?$/, '') || 'http://localhost:5000';

export const fetchAPI = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    const isFormData = options.body instanceof FormData;

    const config = {
        ...options,
        headers: {
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    if (config.body && typeof config.body === 'object' && !isFormData) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);

        const contentType = response.headers.get('content-type') || '';
        const rawText = await response.text();

        let data = null;
        if (rawText.length > 0) {
            if (contentType.includes('application/json')) {
                try {
                    data = JSON.parse(rawText);
                } catch {
                    // Some backend paths may incorrectly label non-JSON as JSON.
                    data = rawText;
                }
            } else {
                data = rawText;
            }
        }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('unauthorized'));
            }

            const message =
                (data && typeof data === 'object' && data.message) ||
                (typeof data === 'string' && data) ||
                `Request failed with status ${response.status}`;

            throw new Error(message);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const uploadFile = async (endpoint, formData, onProgress) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
        }

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data);
                } catch (e) {
                    resolve(xhr.responseText);
                }
            } else {
                if (xhr.status === 401 || xhr.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.dispatchEvent(new Event('unauthorized'));
                }
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.message || 'Upload failed'));
                } catch (e) {
                    reject(new Error('Upload failed'));
                }
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error'));
        });

        xhr.open('POST', url);
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
    });
};