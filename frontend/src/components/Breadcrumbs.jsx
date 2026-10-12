import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <Link to="/" className="breadcrumb-link" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Home size={13} />
        <span>Home</span>
      </Link>

      {items && items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={13} className="breadcrumb-sep" />
            {isLast || !item.link ? (
              <span className="breadcrumb-current">{item.label}</span>
            ) : (
              <Link to={item.link} className="breadcrumb-link">{item.label}</Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
