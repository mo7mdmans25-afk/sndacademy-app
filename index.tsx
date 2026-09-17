/**
 * SANAD ACADEMY PLATFORM — نقطة الدخول
 * أكاديمية السند المتصل لخدمة القرآن الكريم
 *
 * تطبيق React يعمل بالكامل في المتصفح، بلا خادم خلفي.
 * التخزين: ذاكرة المتصفح المحلية + جوجل شيتس كمخزن دائم مشترك.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './src/index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('لم يتم العثور على عنصر الجذر #root في الصفحة');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
