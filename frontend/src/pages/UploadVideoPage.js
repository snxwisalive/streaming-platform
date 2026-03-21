import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../services/api';
import '../styles/UploadVideoPage.css';

const UploadVideoPage = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const [file, setFile] = useState(null);
    const [thumbnail, setThumbnail] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const videoInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);
    const tagInputRef = useRef(null);

    const handleAddTag = (e) => {
        if ((e.key === 'Enter' || e.type === 'blur') && tagInput.trim()) {
            const newTag = tagInput.trim();
            if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
            setShowTagInput(false);
        }
        if (e.key === 'Escape') {
            setTagInput('');
            setShowTagInput(false);
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleShowTagInput = () => {
        setShowTagInput(true);
        setTimeout(() => tagInputRef.current?.focus(), 0);
    };

    const handleSubmit = async () => {
        setError('');

        if (!file || !title) {
            setError('Заголовок та відео файл обов\'язкові');
            return;
        }

        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);
        if (tags.length > 0) {
            formData.append('tags', tags.join(','));
        }
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

        try {
            setLoading(true);
            const data = await fetchAPI('/videos/upload', {
                method: 'POST',
                body: formData,
            });
            console.log('Upload successful:', data);
            navigate('/controlpanel#materials');
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Не вдалося завантажити відео');
            if (err.message.includes('401') || err.message.includes('403') || err.message.includes('unauthorized')) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const isReady = !!file && !!title;

    const getSubmitClass = () => {
        if (loading) return 'upload-submit upload-submit--loading';
        if (isReady) return 'upload-submit upload-submit--active';
        return 'upload-submit';
    };

    return (
        <div className="upload-page">
            <h2 className="upload-page__title">Завантажити відео</h2>
            <p className="upload-page__subtitle">Інформація відео</p>

            {error && <div className="upload-error">{error}</div>}

            {/* Info card */}
            <div className="upload-card">
                {/* Title */}
                <div className="upload-field">
                    <span className="upload-field__label">Заголовок</span>
                    <div className="upload-field__control">
                        <input
                            type="text"
                            className="upload-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введіть заголовок відео"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="upload-field">
                    <span className="upload-field__label">Опис відео</span>
                    <div className="upload-field__control">
                        <textarea
                            className="upload-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 50))}
                            placeholder="Опишіть ваше відео (опціонально)"
                        />
                        <p className={`upload-textarea-counter${description.length >= 40 ? ' upload-textarea-counter--warning' : ''}`}>
                            {description.length}/50
                        </p>
                    </div>
                </div>

                {/* Tags */}
                <div className="upload-field">
                    <span className="upload-field__label">
                        Теги відео
                        <small>(опціонально)</small>
                    </span>
                    <div className="upload-field__control">
                        <div className="upload-tags">
                            {tags.map((tag) => (
                                <span key={tag} className="upload-tag">
                                    {tag}
                                    <button
                                        className="upload-tag__remove"
                                        onClick={() => handleRemoveTag(tag)}
                                        type="button"
                                        aria-label={`Видалити тег ${tag}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            {showTagInput ? (
                                <input
                                    ref={tagInputRef}
                                    className="upload-tags__input"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    onBlur={handleAddTag}
                                    placeholder="Введіть тег..."
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="upload-tags__add"
                                    onClick={handleShowTagInput}
                                >
                                    Додати ще +
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Files section */}
            <p className="upload-files-heading">Файли</p>

            <div className="upload-card">
                {/* Video file */}
                <div className="upload-field">
                    <span className="upload-field__label">Відео файл</span>
                    <div className="upload-field__control">
                        <button
                            type="button"
                            className="upload-file-btn"
                            onClick={() => videoInputRef.current?.click()}
                        >
                            Додати файл
                        </button>
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={(e) => setFile(e.target.files[0] || null)}
                        />
                        {file && (
                            <div className="upload-file-chosen">
                                <span className="upload-file-chosen__check">✓</span>
                                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>
                </div>

                {/* Thumbnail */}
                <div className="upload-field">
                    <span className="upload-field__label">
                        Мініатюра відео
                        <small>(опціонально)</small>
                    </span>
                    <div className="upload-field__control">
                        <button
                            type="button"
                            className="upload-file-btn"
                            onClick={() => thumbnailInputRef.current?.click()}
                        >
                            Додати фото
                        </button>
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => setThumbnail(e.target.files[0] || null)}
                        />
                        {thumbnail && (
                            <div className="upload-file-chosen">
                                <span className="upload-file-chosen__check">✓</span>
                                {thumbnail.name}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button
                type="button"
                className={getSubmitClass()}
                onClick={handleSubmit}
                disabled={loading || !isReady}
            >
                {loading ? 'Завантаження...' : 'Завантажити відео'}
            </button>
        </div>
    );
};

export default UploadVideoPage;