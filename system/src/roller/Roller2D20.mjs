export class Roller2D20 {
	dicesRolled = [];

	successTreshold = 0;

	critTreshold = 1;

	complicationTreshold = 20;

	successes = 0;

	static async rollD20({
		actor = null,
		attribute = 0,
		complication = 20,
		dicenum = 2,
		difficulty = 1,
		item = null,
		rollLocation = false,
		rollname = "Roll xD20",
		skill = 0,
		tag = false,
	}={}) {
		// let dicesRolled = [];
		let successTreshold = parseInt(attribute) + parseInt(skill);
		let critTreshold = tag ? parseInt(skill) : 1;
		let complicationTreshold = parseInt(complication);
		let formula = `${dicenum}d20`;
		let roll = new Roll(formula);

		await roll.evaluate({ async: true });

		let hitLocation = undefined;
		let hitLocationResult = undefined;

		if (rollLocation) {
			let hitLocationRoll = await new Roll("1dh").evaluate({ async: true });
			// try initiating Dice So Nice Roll
			try {
				game.dice3d.showForRoll(hitLocationRoll);
			}
			catch(err) {}

			hitLocation = hitLocationRoll.terms[0].getResultLabel(
				hitLocationRoll.terms[0].results[0]
			);

			hitLocationResult = hitLocationRoll.total;
		}

		await Roller2D20.parseD20Roll({
			actor: actor,
			complicationTreshold,
			critTreshold,
			hitLocation,
			hitLocationResult,
			item: item,
			roll: roll,
			rollname: rollname,
			successTreshold,
		});
	}

	static async parseD20Roll({
		actor = null,
		complicationTreshold = 20,
		critTreshold = 1,
		dicesRolled = [],
		hitLocation=null,
		hitLocationResult=null,
		item = null,
		rerollIndexes = [],
		roll = null,
		rollname = "Roll xD20",
		successTreshold = 0,
	}={}) {
		let i = 0;
		roll.dice.forEach(d => {
			d.results.forEach(r => {
				let diceSuccess = 0;
				let diceComplication = 0;

				if (r.result <= successTreshold) {
					diceSuccess++;
				}

				critTreshold = Math.max(critTreshold, 1);

				if (r.result <= critTreshold) {
					diceSuccess++;
				}

				if (r.result >= complicationTreshold) {
					diceComplication = 1;
				}

				// If there are no rollIndexes sent then it is a new roll.
				// Otherwise it's a re-roll and we should replace dices at given
				// indexes
				if (!rerollIndexes.length) {
					dicesRolled.push({
						success: diceSuccess,
						reroll: false,
						result: r.result,
						complication: diceComplication,
					});
				}
				else {
					dicesRolled[rerollIndexes[i]] = {
						success: diceSuccess,
						reroll: true,
						result: r.result,
						complication: diceComplication,
					};

					i++;
				}
			});
		});

		await Roller2D20.sendToChat({
			actor: actor,
			complicationTreshold: complicationTreshold,
			critTreshold: critTreshold,
			dicesRolled: dicesRolled,
			hitLocation: hitLocation,
			hitLocationResult: hitLocationResult,
			item: item,
			rerollIndexes: rerollIndexes,
			roll: roll,
			rollname: rollname,
			successTreshold: successTreshold,
		});
	}

	static async rerollD20({
		complicationTreshold = 20,
		critTreshold = 1,
		dicesRolled = [],
		rerollIndexes = [],
		roll = null,
		rollname = "Roll xD20",
		successTreshold = 0,
	}={}) {
		if (!rerollIndexes.length) {
			ui.notifications.notify("Select Dice you want to Reroll");
			return;
		}

		let numOfDice = rerollIndexes.length;
		let formula = `${numOfDice}d20`;
		let _roll = new Roll(formula);

		await _roll.evaluate({ async: true });

		await Roller2D20.parseD20Roll({
			rollname: `${rollname} re-roll`,
			roll: _roll,
			successTreshold: successTreshold,
			critTreshold: critTreshold,
			complicationTreshold: complicationTreshold,
			dicesRolled: dicesRolled,
			rerollIndexes: rerollIndexes,
		});
	}

	static async sendToChat({
		actor = null,
		complicationTreshold = 20,
		critTreshold = 1,
		dicesRolled = [],
		hitLocation=null,
		hitLocationResult=null,
		item = null,
		rerollIndexes = [],
		roll = null,
		rollname = "Roll xD20",
		successTreshold = 0,
	}={}) {
		let successesNum = Roller2D20.getNumOfSuccesses(dicesRolled);
		let complicationsNum = Roller2D20.getNumOfComplications(dicesRolled);

		let rollData = {
			rollname,
			successes: successesNum,
			complications: complicationsNum,
			results: dicesRolled,
			successTreshold,
			hitLocation: hitLocation,
			hitLocationResult: hitLocationResult,
			item: item,
			actor: actor,
		};

		const html = await renderTemplate("systems/fallout/templates/chat/roll2d20.hbs", rollData);

		let falloutRoll = {};
		falloutRoll.rollname = rollname;
		falloutRoll.dicesRolled = dicesRolled;
		falloutRoll.successTreshold = successTreshold;
		falloutRoll.critTreshold = critTreshold;
		falloutRoll.complicationTreshold = complicationTreshold;
		falloutRoll.rerollIndexes = rerollIndexes;
		falloutRoll.diceFace = "d20";
		falloutRoll.hitLocation= hitLocation;
		falloutRoll.hitLocationResult = hitLocationResult;

		let chatData = {
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({
				actor: actor,
			}),
			rollMode: game.settings.get("core", "rollMode"),
			content: html,
			flags: { falloutroll: falloutRoll },
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			roll: roll,
		};

		if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
			chatData.whisper = ChatMessage.getWhisperRecipients("GM");
		}
		else if (chatData.rollMode === "selfroll") {
			chatData.whisper = [game.user];
		}

		await ChatMessage.create(chatData);
	}

	static getNumOfSuccesses(results) {
		let s = 0;
		results.forEach(d => {
			s += d.success;
		});
		return s;
	}

	static getNumOfComplications(results) {
		let r = 0;
		results.forEach(d => {
			r += d.complication;
		});
		return r;
	}

	static async rollD6({
		actor = null,
		dicenum = 2,
		rollname = "Roll D6",
		weapon = null,
	}={}) {
		let formula = `${dicenum}dc`;
		let roll = new Roll(formula);

		await roll.evaluate({ async: true });

		await Roller2D20.parseD6Roll({
			rollname: rollname,
			roll: roll,
			weapon: weapon,
			actor: actor,
		});
	}

	static async parseD6Roll({
		actor = null,
		addDice = [],
		dicesRolled = [],
		rerollIndexes = [],
		roll = null,
		rollname = "Roll D6",
		weapon = null,
	}={}) {
		let diceResults = [
			{ result: 1, effect: 0 },
			{ result: 2, effect: 0 },
			{ result: 0, effect: 0 },
			{ result: 0, effect: 0 },
			{ result: 1, effect: 1 },
			{ result: 1, effect: 1 },
		];

		let i = 0;
		roll.dice.forEach(d => {
			d.results.forEach(r => {
				let diceResult = diceResults[r.result - 1];
				diceResult.face = r.result;
				// if there are no rollIndexes sent then it is a new roll.
				// Otherwise it's a re-roll and we should replace dices at given
				// indexes
				if (!rerollIndexes.length) {
					dicesRolled.push(diceResult);
				}
				else {
					dicesRolled[rerollIndexes[i]] = diceResult;
					i++;
				}
			});
		});

		if (addDice.length) {
			dicesRolled = addDice.concat(dicesRolled);
		}

		await Roller2D20.sendD6ToChat({
			actor: actor,
			dicesRolled: dicesRolled,
			rerollIndexes: rerollIndexes,
			roll: roll,
			rollname: rollname,
			weapon: weapon,
		});
	}

	static async rerollD6({
		actor = null,
		dicesRolled = [],
		rerollIndexes = [],
		roll = null,
		rollname = "Roll D6",
		weapon = null,
	}={}) {
		if (!rerollIndexes.length) {
			ui.notifications.notify("Select Dice you want to Reroll");
			return;
		}
		let numOfDice = rerollIndexes.length;
		let formula = `${numOfDice}dc`;
		let _roll = new Roll(formula);

		await _roll.evaluate({ async: true });

		return await Roller2D20.parseD6Roll({
			actor: actor,
			dicesRolled: dicesRolled,
			rerollIndexes: rerollIndexes,
			roll: _roll,
			rollname: `${rollname} [re-roll]`,
			weapon: weapon,
		});
	}

	static async addD6({ rollname = "Roll D6", dicenum = 2, falloutRoll = null, dicesRolled = [], weapon = null, actor = null } = {}) {
		let formula = `${dicenum}dc`;
		let _roll = new Roll(formula);

		await _roll.evaluate({ async: true });

		let newRollName = `${falloutRoll.rollname} [+ ${dicenum} DC]`;
		let oldDiceRolled = falloutRoll.dicesRolled;

		return await Roller2D20.parseD6Roll({
			rollname: newRollName,
			roll: _roll,
			dicesRolled: dicesRolled,
			addDice: oldDiceRolled,
			weapon: weapon,
			actor: actor,
		});
	}

	static async sendD6ToChat({
		actor = null,
		dicesRolled = [],
		rerollIndexes = [],
		roll = null,
		rollname = "Roll D6",
		weapon = null,
	}={}) {
		let damage = dicesRolled.reduce(
			(a, b) => ({ result: a.result + b.result })
		).result;

		let effects = dicesRolled.reduce(
			(a, b) => ({ effect: a.effect + b.effect })
		).effect;

		let weaponDamageTypesList = [];
		let weaponDamageEffects = [];

		if (weapon != null) {
			weaponDamageTypesList = Object.keys(
				weapon.system.damage.damageType
			).filter(
				dt => weapon.system.damage.damageType[dt]
			);

			for (let de in weapon.system.damage.damageEffect) {
				if (weapon.system.damage.damageEffect[de].value) {
					const rank = weapon.system.damage.damageEffect[de].rank ?? "";
					const damageEffectLabel = game.i18n.localize(`FALLOUT.WEAPONS.damageEffect.${de}`);
					const effectLabel = `${damageEffectLabel}${rank}`;

					const effectDescription = fallout.FalloutHovers.LIST[
						weapon.system.damage.damageEffect[de].label.toLowerCase()
					];

					weaponDamageEffects.push({
						effect: effectDescription,
						efectLabel: effectLabel,
						effectId: de,
					});
				}
			}
			// Check for Vicious damage effect and add to damage for each effect rolled
			if (weaponDamageEffects.find(e => e.effectId === "vicious")) {
				damage += effects;
			}
		}

		let rollData = {
			rollname: rollname,
			damage: damage,
			effects: effects,
			results: dicesRolled,
			weaponDamageTypesList,
			weaponDamageEffects,
		};

		const html = await renderTemplate("systems/fallout/templates/chat/rollD6.hbs", rollData);
		let falloutRoll = {};
		falloutRoll.rollname = rollname;
		falloutRoll.dicesRolled = dicesRolled;
		falloutRoll.damage = damage;
		falloutRoll.effects = effects;
		falloutRoll.rerollIndexes = rerollIndexes;
		falloutRoll.diceFace = "d6";
		let chatData = {
			user: game.user.id,
			rollMode: game.settings.get("core", "rollMode"),
			content: html,
			flags: { falloutroll: falloutRoll, weapon: weapon, actor: actor },
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			roll: roll,
		};

		if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
			chatData.whisper = ChatMessage.getWhisperRecipients("GM");
		}
		else if (chatData.rollMode === "selfroll") {
			chatData.whisper = [game.user];
		}
		await ChatMessage.create(chatData);
	}
}

