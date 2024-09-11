import { it, describe, expect } from 'vitest';
import { BattleSimulation } from '../src/battleSimulation';
import { createBattleUnit } from '../src/battleUnit';

const createBattleSimulation = (l, r) => {
  return new BattleSimulation(l, r);
};

describe('BattleSim', () => {
  it('can determine movement order', () => {
    // prettier-ignore
    const battleUnit1 = createBattleUnit();
    const battleUnit2 = createBattleUnit();
    const battleUnit3 = createBattleUnit();
    const battleUnit4 = createBattleUnit();

    battleUnit1.speed = 10;
    battleUnit2.speed = 20;
    battleUnit3.speed = 20;
    battleUnit4.speed = 10;

    const leftUnits = [battleUnit1, battleUnit2];
    const rightUnits = [battleUnit3, battleUnit4];

    const battle = createBattleSimulation(leftUnits, rightUnits);
    const unitOrder = battle.determineTurnOrder();

    expect(unitOrder).toEqual([
      battleUnit2,
      battleUnit3,
      battleUnit1,
      battleUnit4,
    ]);
  });

  describe('attack at position', () => {
    it('can attack at position and defeat one unit', () => {
      const battleUnit1 = createBattleUnit();
      const battleUnit2 = createBattleUnit();

      battleUnit1.attack = 10;

      const leftUnits = [battleUnit1];
      const rightUnits = [battleUnit2];

      const battle = createBattleSimulation(leftUnits, rightUnits);
      const automatedControls = battle.attackAtPosition(battleUnit1, 0);

      for (const aControl of automatedControls) {
        aControl.init();
        aControl.commit();
      }

      expect(battleUnit2.stackSize).toEqual(0);
      expect(battle.rightUnits).toEqual([]);
    });

    it('can attack at position and defeat one unit with mult stacks', () => {
      const battleUnit1 = createBattleUnit();
      const battleUnit2 = createBattleUnit();
      const battleUnit3 = createBattleUnit();
      const battleUnit4 = createBattleUnit();

      const leftUnits = [battleUnit1, battleUnit2];
      const rightUnits = [battleUnit3, battleUnit4];

      const battle = createBattleSimulation(leftUnits, rightUnits);
      const automatedControls = battle.attackAtPosition(battleUnit1, 0);

      for (const aControl of automatedControls) {
        aControl.init();
        aControl.commit();
      }

      expect(battleUnit3.stackSize).toEqual(0);
      expect(battle.rightUnits).toEqual([battleUnit4]);
    });

    it('can attack at position and defeat a large stack of units', () => {
      const battleUnit1 = createBattleUnit();
      const battleUnit2 = createBattleUnit();

      battleUnit1.attack = 10;
      battleUnit1.stackSize = 100;

      battleUnit2.stackSize = 100;

      const leftUnits = [battleUnit1];
      const rightUnits = [battleUnit2];

      const battle = createBattleSimulation(leftUnits, rightUnits);
      const automatedControls = battle.attackAtPosition(battleUnit1, 0);

      for (const aControl of automatedControls) {
        aControl.init();
        aControl.commit();
      }

      expect(battleUnit2.stackSize).toEqual(0);
      expect(battle.rightUnits).toEqual([]);
    });

    it('leaves a stack of units alive with proper hp', () => {
      const battleUnit1 = createBattleUnit();
      const battleUnit2 = createBattleUnit();

      // expect 35 damage to be dealt
      battleUnit1.attack = 7;
      battleUnit1.stackSize = 5;

      battleUnit2.stackSize = 20;
      battleUnit2.health = battleUnit2.maxHealth = 10;
      battleUnit2.defense = 0;

      const expectedNextStackSize = 17;

      const leftUnits = [battleUnit1];
      const rightUnits = [battleUnit2];

      const battle = createBattleSimulation(leftUnits, rightUnits);
      const automatedControls = battle.attackAtPosition(battleUnit1, 0);

      for (const aControl of automatedControls) {
        aControl.init();
        aControl.commit();
      }

      expect(battleUnit2.stackSize).toEqual(expectedNextStackSize);
      expect(battleUnit2.health).toEqual(5);
    });

    it('leaves a stack of units alive with proper hp, even when resulting hp is 0', () => {
      const battleUnit1 = createBattleUnit();
      const battleUnit2 = createBattleUnit();

      // expect 140 damage to be dealt
      battleUnit1.attack = 7;
      battleUnit1.stackSize = 20;

      battleUnit2.stackSize = 16;
      battleUnit2.health = battleUnit2.maxHealth = 10;
      battleUnit2.defense = 0;

      const expectedNextStackSize = 2;

      const leftUnits = [battleUnit1];
      const rightUnits = [battleUnit2];

      const battle = createBattleSimulation(leftUnits, rightUnits);
      const automatedControls = battle.attackAtPosition(battleUnit1, 0);

      for (const aControl of automatedControls) {
        aControl.init();
        aControl.commit();
      }

      expect(battleUnit2.stackSize).toEqual(expectedNextStackSize);
      expect(battleUnit2.health).toEqual(battleUnit2.maxHealth);
    });
  });

  describe('defeating a unit should maintain the turn order', () => {
    const battleUnit1 = createBattleUnit();
    const battleUnit2 = createBattleUnit();
    const battleUnit3 = createBattleUnit();
    const battleUnit4 = createBattleUnit();

    battleUnit1.speed = 4;
    battleUnit2.speed = 3;
    battleUnit3.speed = 2;
    battleUnit4.speed = 1;

    const leftUnits = [battleUnit1, battleUnit2];
    const rightUnits = [battleUnit3, battleUnit4];

    it('maintains order if turn index is less than the removed unit index', () => {
      const battle = createBattleSimulation(
        leftUnits.slice(),
        rightUnits.slice()
      );
      const unitOrderIndex = 1;
      const unitOrder = battle.determineTurnOrder();
      battle.removeUnit(battleUnit3);

      expect(unitOrder).toEqual([battleUnit1, battleUnit2, battleUnit4]);
      expect(unitOrderIndex).toEqual(1);
    });

    it('maintains order if turn index is greater than the removed unit index', () => {
      const battle = createBattleSimulation(
        leftUnits.slice(),
        rightUnits.slice()
      );
      const unitOrderIndex = 3;
      const unitOrder = battle.determineTurnOrder();
      battle.removeUnit(battleUnit3);

      expect(unitOrder).toEqual([battleUnit1, battleUnit2, battleUnit4]);
      expect(unitOrderIndex).toEqual(2);
    });
  });
});
