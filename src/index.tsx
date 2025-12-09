/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/* eslint-disable import/no-import-module-exports */

import './index.css';
import React, { lazy, Suspense } from 'react';

import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoadingView } from './boot/splash';
import { BASENAME } from './constants';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

window.addEventListener('contextmenu', (ev) => {
	const path = ev.composedPath?.() || [];

	const isAllowedTarget = path.some(
		(element) => element instanceof HTMLElement && ['A', 'IMG'].includes(element.tagName)
	);

	const selection = window.getSelection?.();
	const isTextSelection = selection?.type === 'Range';

	const hasBypassClass = path.some(
		(element) =>
			element instanceof HTMLElement && element.classList.contains('carbonio-bypass-context-menu')
	);

	if (!(isAllowedTarget || isTextSelection || hasBypassClass)) {
		ev.preventDefault();
	}
});

// Hide "Find shares" button in mail folder sidebar - aggressive multi-strategy approach
const hideFindSharesButton = (): void => {
	// Helper function to check if text matches "find shares"
	const matchesFindShares = (text: string | null | undefined): boolean => {
		if (!text) return false;
		const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
		return normalized === 'find shares' || normalized.includes('find shares');
	};

	// Helper function to hide button aggressively
	const hideButton = (button: HTMLElement): void => {
		if (button.hasAttribute('data-find-shares-hidden')) return;
		
		// Multiple hiding strategies to prevent React from resetting
		button.style.setProperty('display', 'none', 'important');
		button.style.setProperty('visibility', 'hidden', 'important');
		button.style.setProperty('opacity', '0', 'important');
		button.style.setProperty('height', '0', 'important');
		button.style.setProperty('width', '0', 'important');
		button.style.setProperty('padding', '0', 'important');
		button.style.setProperty('margin', '0', 'important');
		button.style.setProperty('pointer-events', 'none', 'important');
		button.setAttribute('hidden', 'true');
		button.setAttribute('aria-hidden', 'true');
		button.setAttribute('data-find-shares-hidden', 'true');
		
		// Remove from DOM completely
		try {
			button.remove();
		} catch (e) {
			// Ignore if already removed
		}
	};

	// Strategy 1: Find by button text (case-insensitive, flexible matching)
	const buttons = document.querySelectorAll('button');
	buttons.forEach((button) => {
		const textContent = button.textContent;
		if (matchesFindShares(textContent)) {
			hideButton(button);
		}
	});

	// Strategy 2: Find by inner elements text content and hide parent button
	const allElements = document.querySelectorAll('div, span, p');
	allElements.forEach((element) => {
		const textContent = element.textContent;
		if (matchesFindShares(textContent)) {
			const button = element.closest('button');
			if (button) {
				hideButton(button);
			}
			// Also hide parent containers that only contain this button
			const parent = element.closest('div[class*="Container"]');
			if (parent) {
				const buttonsInParent = parent.querySelectorAll('button:not([data-find-shares-hidden])');
				if (buttonsInParent.length <= 1) {
					parent.style.setProperty('display', 'none', 'important');
					parent.style.setProperty('visibility', 'hidden', 'important');
				}
			}
		}
	});

	// Strategy 3: Find by data-testid or other attributes
	const testButtons = document.querySelectorAll('button[data-testid*="share"], button[data-testid*="Share"], button[aria-label*="share" i], button[aria-label*="Share"]');
	testButtons.forEach((button) => {
		const textContent = button.textContent;
		const ariaLabel = button.getAttribute('aria-label');
		if (matchesFindShares(textContent) || matchesFindShares(ariaLabel)) {
			hideButton(button);
		}
	});
};

// Inject CSS to ensure button stays hidden even if React re-renders
const injectHideCSS = (): void => {
	const styleId = 'hide-find-shares-css';
	if (!document.getElementById(styleId)) {
		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
			button[data-find-shares-hidden="true"] {
				display: none !important;
				visibility: hidden !important;
				opacity: 0 !important;
				height: 0 !important;
				width: 0 !important;
				padding: 0 !important;
				margin: 0 !important;
				pointer-events: none !important;
			}
		`;
		document.head.appendChild(style);
	}
};

// Set up aggressive monitoring
const setupFindSharesButtonHider = (): void => {
	injectHideCSS();
	hideFindSharesButton();

	// MutationObserver with aggressive settings
	const observer = new MutationObserver(() => {
		hideFindSharesButton();
	});

	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['style', 'class', 'data-testid']
		});
	}

	// Interval check as backup (every 100ms for first 10 seconds, then every 500ms)
	let checkCount = 0;
	const aggressiveInterval = setInterval(() => {
		hideFindSharesButton();
		checkCount++;
		if (checkCount > 100) {
			clearInterval(aggressiveInterval);
			// Switch to less frequent checks
			setInterval(hideFindSharesButton, 500);
		}
	}, 100);

	// Multiple delayed checks for late-loading content
	[100, 500, 1000, 2000, 3000, 5000, 10000].forEach((delay) => {
		setTimeout(hideFindSharesButton, delay);
	});
};

// Initialize immediately and on multiple events
hideFindSharesButton();
injectHideCSS();

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', setupFindSharesButtonHider);
} else {
	setupFindSharesButtonHider();
}

window.addEventListener('load', () => {
	setTimeout(setupFindSharesButtonHider, 100);
});

// Also check when React might have finished rendering
setTimeout(setupFindSharesButtonHider, 2000);
setTimeout(setupFindSharesButtonHider, 5000);

const Bootstrapper = lazy(() => import('./boot/bootstrapper'));

if (module.hot) {
	module.hot.accept();
}

const router = createBrowserRouter(
	[
		{
			path: '/*',
			element: (
				<Suspense fallback={<LoadingView />}>
					<Bootstrapper key="boot" />
				</Suspense>
			)
		}
	],
	{ basename: BASENAME }
);

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
