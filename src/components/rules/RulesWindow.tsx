import React, { useState, useRef, useEffect } from 'react';
import { RulesQuickReference } from './RulesQuickReference';
import { RulesDetailedSection } from './RulesDetailedSection';
import type { RuleSet } from '../../RuleSet';
import './RulesWindow.css';

interface RulesWindowProps {
    ruleset: RuleSet;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
}

export const RulesWindow: React.FC<RulesWindowProps> = ({
    ruleset,
    onClose,
    initialPosition = { x: 100, y: 100 }
}) => {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    // Extract ruleset name for display
    const rulesetName = ruleset.name;

    // Load saved position from localStorage
    useEffect(() => {
        const savedPosition = localStorage.getItem('rulesWindowPosition');
        if (savedPosition) {
            try {
                const parsed = JSON.parse(savedPosition);
                setPosition(parsed);
            } catch (e) {
                // Use default position if parsing fails
            }
        }
    }, []);

    // Save position to localStorage
    useEffect(() => {
        localStorage.setItem('rulesWindowPosition', JSON.stringify(position));
    }, [position]);

    // Handle mouse down on title bar
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('draggable')) {
            setIsDragging(true);
            const rect = windowRef.current?.getBoundingClientRect();
            if (rect) {
                setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        }
    };

    // Handle mouse move for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Handle keyboard events for accessibility
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            ref={windowRef}
            className="rules-window"
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            role="dialog"
            aria-labelledby="rules-window-title"
            aria-modal="false"
        >
            {/* Title Bar */}
            <div
                className="rules-window-header draggable"
                onMouseDown={handleMouseDown}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <h2 id="rules-window-title" className="rules-window-title draggable">
                    📖 Game Rules
                </h2>
                <button
                    className="rules-window-close"
                    onClick={onClose}
                    aria-label="Close rules window"
                    type="button"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="rules-window-content">
                {/* Ruleset Name Header */}
                <div className="rules-ruleset-name">Rule Set: {rulesetName}</div>

                {/* Quick Reference Section */}
                <RulesQuickReference
                    ruleset={ruleset}
                />

                {/* Separator */}
                <div className="rules-section-separator" />

                {/* Detailed Rules Section */}
                <RulesDetailedSection
                    ruleset={ruleset}
                />
            </div>
        </div>
    );
};
