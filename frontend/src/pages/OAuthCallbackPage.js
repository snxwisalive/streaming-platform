import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallbackPage({ onLogin }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const userRaw = searchParams.get('user');

        if (token && userRaw) {
            try {
                const user = JSON.parse(decodeURIComponent(userRaw));
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                onLogin(user);
                navigate('/', { replace: true });
            } catch {
                navigate('/login?error=oauth_failed', { replace: true });
            }
        } else {
            navigate('/login?error=oauth_failed', { replace: true });
        }
    }, []);

    return <div>Вхід...</div>;
}