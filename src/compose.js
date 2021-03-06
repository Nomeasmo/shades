import attr from './lens-crafters/attr';
import { map } from './utils/list';

export const compile = lens => do {
  if (['string', 'number'].includes(typeof lens)) {
    attr(lens);
  } else {
    ({
      traversal: false,
      optional: false,
      ...lens
    });
  }
};

export default (...lenses) => do {
  if (lenses.length === 1) compile(lenses[0]);
  else {
    ({
      get: obj =>
        lenses.map(compile).reduce(
          ({ traverser, state, shortCircuited }, lens) => {
            const nextState = shortCircuited
              ? null
              : traverser(lens.get)(state);

            return {
              state: nextState,
              traverser: lens.traversal ? f => map(traverser(f)) : traverser,
              shortCircuited:
                shortCircuited ||
                (lens.optional &&
                  (nextState === null || nextState === undefined))
            };
          },
          { state: obj, traverser: x => x, shortCircuited: false }
        ).state,

      mod: f => (obj, ...params) => do {
        const aux = (object, lenses) => do {
          const [first, ...rest] = lenses;
          if (rest.length === 0) {
            first.mod(f)(object, ...params);
          } else {
            first.mod(obj => aux(obj, rest))(object, ...params);
          }
        };

        aux(obj, lenses.map(compile));
      }
    });
  }
};
