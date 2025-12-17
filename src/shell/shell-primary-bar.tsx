/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useEffect, useMemo, useRef } from 'react';

import { Button, Container, Row, Tooltip } from '@zextras/carbonio-design-system';
import { map, isEmpty, trim, filter, sortBy } from 'lodash';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import BadgeWrap from './badge-wrap';
import { AppContextProvider } from '../boot/app/app-context-provider';
import { BOARD_CONTAINER_ZINDEX, PRIMARY_BAR_WIDTH } from '../constants';
import { useCurrentRoute } from '../history/hooks';
import { useAppStore } from '../store/app';
import { minimizeBoards, reopenBoards, useBoardStore } from '../store/boards';
import type { PrimaryAccessoryView, PrimaryBarView } from '../types/apps';
import { checkRoute } from '../utility-bar/utils';

function noop(): void {
	return undefined;
}

const PrimaryBarContainer = styled(Container)<{ $isHorizontal?: boolean }>`
	${({ $isHorizontal, theme }): string =>
		!$isHorizontal ? `border-right: 0.0625rem solid ${theme.palette.gray3.regular};` : ''}
	z-index: ${BOARD_CONTAINER_ZINDEX + 1};
`;

const ToggleBoardIcon = (): React.JSX.Element | null => {
	const minimized = useBoardStore((s) => s.minimized);
	const boards = useBoardStore((s) => s.boards);

	return isEmpty(boards) ? null : (
		<Container width={'3rem'} height={'3rem'}>
			<Button
				type={'ghost'}
				color="primary"
				icon={minimized ? 'BoardOpen' : 'BoardCollapse'}
				onClick={minimized ? reopenBoards : minimizeBoards}
				size="large"
			/>
		</Container>
	);
};

type PrimaryBarItemProps = {
	view: PrimaryBarView;
	active: boolean;
	onClick: () => void;
};

type PrimaryBarAccessoryItemProps = {
	view: PrimaryAccessoryView;
};

const PrimaryBarElement = ({ view, active, onClick }: PrimaryBarItemProps): React.JSX.Element => (
	<BadgeWrap badge={view.badge} label={view.label}>
		{typeof view.component === 'string' ? (
			<Button
				icon={view.component}
				backgroundColor={active ? 'gray4' : 'gray6'}
				labelColor={active ? 'primary' : 'text'}
				onClick={onClick}
				size="large"
			/>
		) : (
			<view.component active={active} onClick={onClick} />
		)}
	</BadgeWrap>
);

const PrimaryBarAccessoryElement = ({ view }: PrimaryBarAccessoryItemProps): React.JSX.Element => (
	<Tooltip label={view.label} placement="right" key={view.id}>
		<AppContextProvider key={view.id} pkg={view.app}>
			{typeof view.component === 'string' ? (
				<Button
					icon={view.component}
					backgroundColor="gray6"
					labelColor="text"
					onClick={view.onClick ?? noop}
					size="large"
				/>
			) : (
				<view.component />
			)}
		</AppContextProvider>
	</Tooltip>
);

const OverlayRow = styled(Row)`
	min-height: 0.0625rem;
	overflow-y: auto;
	overflow-y: overlay;
`;

interface ShellPrimaryBarProps {
	orientation?: 'vertical' | 'horizontal';
}

const ShellPrimaryBar = (props: ShellPrimaryBarProps = {}): React.JSX.Element | null => {
	const { orientation = 'vertical' } = props;
	const activeRoute = useCurrentRoute();
	const primaryBarViews = useAppStore((s) => s.views.primaryBar);
	const navigate = useNavigate();

	const { pathname, search } = useLocation();
	const routesRef = useRef<Record<string, string>>({});

	useEffect(() => {
		routesRef.current = primaryBarViews.reduce((accumulator, view) => {
			if (!accumulator[view.id]) {
				accumulator[view.id] = view.route;
			}
			return accumulator;
		}, routesRef.current);
	}, [primaryBarViews]);

	useEffect(() => {
		if (activeRoute) {
			routesRef.current = {
				...routesRef.current,
				[activeRoute.id]: `${trim(pathname, '/')}${search}`
			};
		}
	}, [activeRoute, pathname, search]);

	const primaryBarAccessoryViews = useAppStore((s) => s.views.primaryBarAccessories);

	const accessoryViews = useMemo(
		() =>
			sortBy(
				filter(primaryBarAccessoryViews, (v) => checkRoute(v, activeRoute)),
				'position'
			),
		[activeRoute, primaryBarAccessoryViews]
	);

	const primaryBarItems = useMemo(
		() =>
			map(
				filter(primaryBarViews, (view) => {
					// Filter out "distribution lists" button
					const isDistributionLists =
						(view.label || '').toLowerCase().includes('distribution lists') ||
						(view.label || '').toLowerCase().includes('distributionlist') ||
						(view.id || '').toLowerCase().includes('distribution lists') ||
						(view.id || '').toLowerCase().includes('distributionlist') ||
						(view.route || '').toLowerCase().includes('distribution lists') ||
						(view.route || '').toLowerCase().includes('distributionlist');

					return view.visible && !isDistributionLists;
				}),
				(view) => (
					<PrimaryBarElement
						key={view.id}
						onClick={(): void => navigate(`/${routesRef.current[view.id]}`)}
						view={view}
						active={activeRoute?.id === view.id}
					/>
				)
			),
		[navigate, activeRoute?.id, primaryBarViews]
	);

	const accessoryItems = useMemo(
		() => accessoryViews.map((view) => <PrimaryBarAccessoryElement view={view} key={view.id} />),
		[accessoryViews]
	);

	const isHorizontal = orientation === 'horizontal';

	return (
		<PrimaryBarContainer
			$isHorizontal={isHorizontal}
			width={isHorizontal ? 'auto' : PRIMARY_BAR_WIDTH}
			height={isHorizontal ? 'auto' : 'fill'}
			background={'none'}
			orientation={orientation}
			mainAlignment="flex-start"
			crossAlignment="flex-start"
			data-testid="SideMenuContainer"
		>
			<OverlayRow
				mainAlignment="flex-start"
				crossAlignment="flex-start"
				orientation={orientation}
				takeAvailableSpace={!isHorizontal}
				wrap="nowrap"
			>
				{primaryBarItems}
				<ToggleBoardIcon />
			</OverlayRow>
			<OverlayRow
				mainAlignment={isHorizontal ? 'flex-start' : 'flex-end'}
				orientation={orientation}
				wrap="nowrap"
			>
				{accessoryItems}
			</OverlayRow>
		</PrimaryBarContainer>
	);
};

export default ShellPrimaryBar;
