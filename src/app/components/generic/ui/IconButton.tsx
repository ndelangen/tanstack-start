import {
  UIButton,
  UIButtonLink,
  type UIButtonLinkProps,
  type UIButtonProps,
  type UIButtonVariant,
} from './UIButton';

export type IconButtonVariant = UIButtonVariant;
export type IconButtonProps = UIButtonProps;
export type IconButtonLinkProps = UIButtonLinkProps;

/**
 * Square icon control: delegates to [`UIButton`](./UIButton.tsx) with `iconOnly` set.
 * Pass `to` for a router link; otherwise a `<button>`.
 */
export function IconButton(props: UIButtonProps) {
  return <UIButton iconOnly {...props} />;
}

export function IconButtonLink(props: IconButtonLinkProps) {
  return <UIButtonLink {...props} iconOnly />;
}
