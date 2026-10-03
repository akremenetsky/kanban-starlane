import merge from 'deepmerge';
import update, { Spec } from 'immutability-helper';
import { Path, TreeNode } from 'src/dnd/types';
import { isPlainObject } from 'src/shared/util';

import { SiblingDirection, getSiblingDirection } from './path';

/** The node at `path`; the caller names its type (e.g. `getEntityFromPath<Lane>`). */
export function getEntityFromPath<R extends TreeNode = TreeNode>(root: TreeNode, path: Path): R {
  const step = path.length ? path[0] : null;

  if (step !== null && root.children && root.children[step]) {
    return getEntityFromPath<R>(root.children[step], path.slice(1));
  }

  return root as R;
}

export function buildUpdateMutation(path: Path, mutation: Spec<TreeNode>) {
  let pathedMutation: Spec<TreeNode> = mutation;

  for (let i = path.length - 1; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildUpdateParentMutation(path: Path, mutation: Spec<TreeNode>) {
  let pathedMutation: Spec<TreeNode> = mutation;

  for (let i = path.length - 2; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildRemoveMutation(path: Path, replacement?: TreeNode) {
  const val: [number, number, ...TreeNode[]] = replacement
    ? [path.last(), 1, replacement]
    : [path.last(), 1];
  return buildUpdateParentMutation(path, {
    children: {
      $splice: [val],
    },
  });
}

export function buildInsertMutation(
  destination: Path,
  entities: TreeNode[],
  destinationModifier: number = 0
) {
  return buildUpdateParentMutation(destination, {
    children: {
      $splice: [[destination.last() + destinationModifier, 0, ...entities]],
    },
  });
}

export function buildAppendMutation(destination: Path, entities: TreeNode[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $push: entities,
    },
  });
}

export function buildPrependMutation(destination: Path, entities: TreeNode[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $unshift: entities,
    },
  });
}

// The tree helpers return the type they were given: a mutation keeps the root's shape.

export function moveEntity<T extends TreeNode>(
  root: T,
  source: Path,
  destination: Path,
  transform?: (entity: TreeNode) => TreeNode | TreeNode[],
  replace?: (entity: TreeNode) => TreeNode
): T {
  const entity = transform
    ? transform(getEntityFromPath(root, source))
    : getEntityFromPath(root, source);
  const siblingDirection = getSiblingDirection(source, destination);

  const destinationModifier = siblingDirection === SiblingDirection.After ? -1 : 0;

  const replacement = replace?.(getEntityFromPath(root, source));
  const removeMutation = buildRemoveMutation(source, replacement);
  const insertMutation = buildInsertMutation(
    destination,
    Array.isArray(entity) ? entity : [entity],
    destinationModifier
  );

  const mutation = merge<Spec<TreeNode>>(removeMutation, insertMutation, {
    isMergeableObject: (val) => {
      return isPlainObject(val) || Array.isArray(val);
    },
  });

  const newBoard = update(root, mutation as Spec<T>);

  return newBoard;
}

export function removeEntity<T extends TreeNode>(root: T, target: Path, replacement?: TreeNode): T {
  return update(root, buildRemoveMutation(target, replacement) as Spec<T>);
}

export function insertEntity<T extends TreeNode>(
  root: T,
  destination: Path,
  entities: TreeNode[]
): T {
  return update(root, buildInsertMutation(destination, entities) as Spec<T>);
}

export function appendEntities<T extends TreeNode>(
  root: T,
  destination: Path,
  entities: TreeNode[]
): T {
  return update(root, buildAppendMutation(destination, entities) as Spec<T>);
}

export function prependEntities<T extends TreeNode>(
  root: T,
  destination: Path,
  entities: TreeNode[]
): T {
  return update(root, buildPrependMutation(destination, entities) as Spec<T>);
}

/** `N` is the type of the node at `path`, which the mutation applies to. */
export function updateEntity<T extends TreeNode, N extends TreeNode = TreeNode>(
  root: T,
  path: Path,
  mutation: Spec<N>
): T {
  return update(root, buildUpdateMutation(path, mutation as Spec<TreeNode>) as Spec<T>);
}

export function updateParentEntity<T extends TreeNode>(
  root: T,
  path: Path,
  mutation: Spec<TreeNode>
): T {
  return update(root, buildUpdateParentMutation(path, mutation) as Spec<T>);
}
