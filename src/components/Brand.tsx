import icon from '../../branding/icon.png';
import wordmark from '../../branding/wordmark.png';
import './brand.css';

export function Brand({ compact = false }: { compact?: boolean }) {
 return <div className={'app-brand' + (compact ? ' app-brand-compact' : '')} role="img" aria-label="Marginalia">
  <img className="app-brand-icon" src={icon} alt="" />
  <span className="app-wordmark"><img src={wordmark} alt="" /></span>
 </div>;
}
