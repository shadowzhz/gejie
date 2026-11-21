import { STORY_CHARACTERS } from '../data/characters.js';
import { STORY_QUESTS, STORY_QUEST_STAGES } from '../data/story.js';
import { MIN_PER_DAY } from './calendar.js';

function boundRelation(value) {
  return Number.isFinite(value) ? Math.max(-100, Math.min(100, Math.trunc(value))) : 0;
}

export function storyRelation(gs, id) {
  if (!Object.hasOwn(STORY_CHARACTERS, id)) return null;
  const saved = gs.story?.relations?.[id];
  return saved || { ...STORY_CHARACTERS[id].initial, progress: '' };
}

export function changeStoryRelation(gs, id, favor, trust, progress) {
  const current = storyRelation(gs, id);
  if (!current) return;
  gs.story.relations[id] = {
    favor: boundRelation(current.favor + favor),
    trust: boundRelation(current.trust + trust),
    progress: progress || current.progress
  };
}

export function advanceStoryQuest(gs, id, stage, outcome = '') {
  const quest = STORY_QUESTS[id];
  if (!Object.hasOwn(STORY_QUESTS, id)) return;
  const current = gs.story.quests[id];
  const stages = [...Object.keys(quest.steps), 'completed'];
  const index = current ? stages.indexOf(current.stage) : -1;
  if (current && (index < 0 || current.stage === 'completed')) return;
  if (stage !== stages[index + 1] && !(current && stage === 'failed')) return;
  const followupAt = outcome && quest.followupEvent ? gs.minutes + quest.followupDays * MIN_PER_DAY : null;
  gs.story.quests[id] = { stage, outcome, followupAt, clues: current?.clues ?? [] };
}

export function addStoryClue(gs, questId, clueId) {
  const progress = gs.story.quests[questId];
  if (progress && Object.hasOwn(STORY_QUESTS[questId].clues, clueId) && !progress.clues.includes(clueId)) {
    progress.clues.push(clueId);
  }
}

export function restoreStoryProgress(gs) {
  if (!gs?.player) return;
  const saved = gs.story;
  gs.story = { relations: {}, quests: {}, history: {} };
  if (saved) {
    for (const id of Object.keys(STORY_CHARACTERS)) {
      const relation = saved.relations?.[id];
      if (relation) gs.story.relations[id] = {
        favor: boundRelation(relation.favor),
        trust: boundRelation(relation.trust),
        progress: typeof relation.progress === 'string' ? relation.progress : ''
      };
    }
    for (const [id, quest] of Object.entries(STORY_QUESTS)) {
      const progress = saved.quests?.[id];
      if (!Object.hasOwn(quest.steps, progress?.stage) && !Object.hasOwn(STORY_QUEST_STAGES, progress?.stage)) continue;
      const { stage, outcome, followupAt, clues } = progress;
      gs.story.quests[id] = { stage, outcome, followupAt: Number.isFinite(followupAt) ? followupAt : null, clues: [] };
      if (Array.isArray(clues)) {
        for (const clue of clues) addStoryClue(gs, id, clue);
      }
    }
    if (Number.isFinite(saved.lifeReadyAt)) gs.story.lifeReadyAt = saved.lifeReadyAt;
    if (saved.history && typeof saved.history === 'object') gs.story.history = saved.history;
  } else {
    const flags = gs.flags ?? {};
    if (flags.mo_faction) changeStoryRelation(gs, 'mobei', 20, 30, '学堂同练');
    if (flags.chi_faction) changeStoryRelation(gs, 'chicheng', 20, 30, '替赤脉备货');
    if (flags.bai_read) changeStoryRelation(gs, 'bainingbing', 20, 20, '切磋取胜');
    if (flags['event_done:jia_missing']) {
      gs.story.quests.caravan = flags['event_done:jia_questions']
        ? { stage: 'completed', outcome: 'legacy', followupAt: null, clues: [] }
        : { stage: 'investigate', outcome: '', followupAt: null, clues: [] };
      if (flags.jia_evidence) addStoryClue(gs, 'caravan', 'tracks');
    }
    if (flags['event_done:jia_missing'] && !flags['event_done:jia_questions']) {
      if (flags.jia_evidence) changeStoryRelation(gs, 'jiafu', 5, 5, '替商队保管失物');
      else if (!flags.jia_missing_stones) changeStoryRelation(gs, 'jiafu', 15, 25, '护送伙计回寨');
    }
    if (flags.jia_witness) changeStoryRelation(gs, 'jiafu', 20, 35, '已收下失物与足迹');
    if (flags.jia_missing_stones && !flags['event_done:jia_questions']) {
      changeStoryRelation(gs, 'jiafu', -30, -25, '伙计指认你拿了货款');
    }
  }
}
