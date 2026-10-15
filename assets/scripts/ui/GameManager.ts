import {
  _decorator,
  Component,
  Node,
  UITransform,
  Label,
  tween,
  Vec3,
  Color,
  assetManager,
  Sprite,
  SpriteFrame,
  BlockInputEvents,
} from 'cc';
import { Bottle, Bag, ColorKey, LevelConfig, MoveHistoryItem } from '../core/types';
import {
  canSelectBottle,
  canSelectBottleNoToast,
  canPourInto,
  getPourableCount,
  pickNextNeededBagColor,
  checkGameWon,
  isCompleteBottle,
} from '../core/waterSortLogic';
import { getLevelConfig, MECHANIC_INTROS } from '../core/levelGenerator';
import { COLORS } from '../core/colors';
import { GameBoard } from './GameBoard';
import { WaterStream } from './WaterStream';

const { ccclass, property } = _decorator;

// 4x Retina 高保真 UI 视觉资产 UUID 表
const UI_ASSET_UUIDS = {
  btnSettings: '1ae13f00-daf7-42f7-b70d-3bb84a725891@f9941',
  btnPower: 'd01f6581-c226-428d-b9d0-0be21119a342@f9941',
  levelPill: '9b543135-bf6d-4a99-af58-dc032e2d4343@f9941',
  badgeRed1: '6502b239-5c1a-42bf-8019-dd68055c46ab@f9941',
  badgeVideo: '3024b34c-d827-4621-8f89-524a0904e8f4@f9941',
  bagRed: '2d33f627-93cd-47dc-b9a0-3bedbece8417@f9941',
  bagYellow: 'e2878a3e-c9ca-4611-a762-2a9a963a9a6a@f9941',
  bagBlue: '2c81d24f-0614-42f6-b738-e8121537e898@f9941',
  bagVideo: '554f59c8-6d68-4290-a832-dac372357192@f9941',
  cardBg: '981be82b-08a3-42cd-9936-7d200a2cd46c@f9941',
  btnPrimary: '6987067f-4854-43df-b4af-586c314a0220@f9941',
  pedestal: 'ef431f4e-76d5-452a-8b85-85b4d4f89dde@f9941',
  badgeGold: '283182b5-f869-4624-b516-3a18b3b6230d@f9941',
  silkDrape: 'd58023f7-9328-4fa5-9d4c-d94892d84088@f9941',
  iceBase: '268b5093-e2f8-4662-b302-7527c287ceeb@f9941',
  giantCat: '786c6a08-05f9-4264-9e95-e96129d01543@f9941',
  tubeGlass: '7b422a4d-76c3-45d9-bee7-ae2e085645ca@f9941',
};

@ccclass('GameManager')
export class GameManager extends Component {
  @property(GameBoard)
  public gameBoard: GameBoard = null!;

  @property(WaterStream)
  public waterStream: WaterStream = null!;

  private _currentLevelNum: number = 7;
  private _currentCfg: LevelConfig = null!;
  private _bottles: Bottle[] = [];
  private _bags: Bag[] = [];
  private _packedTotal: number = 0;
  private _pourCountTotal: number = 0;
  private _remainingMoves: number | null = null;
  private _selectedIndex: number | null = null;
  private _isBusy: boolean = false;
  private _history: MoveHistoryItem[] = [];
  private _shownIntros: Set<string> = new Set();

  // 基础 UI 节点
  private _shoppingBagsNode: Node | null = null;
  private _modeBannerNode: Node | null = null;
  private _modeBannerTextLabel: Label | null = null;
  private _modeBannerProgressLabel: Label | null = null;
  private _levelLabel: Label | null = null;
  private _movesLabel: Label | null = null;

  // 果冻玻璃弹窗节点
  private _modalMaskNode: Node | null = null;
  private _modalCardNode: Node | null = null;
  private _modalBadgeLabel: Label | null = null;
  private _modalTitleLabel: Label | null = null;
  private _modalSubLabel: Label | null = null;
  private _modalDescLabel: Label | null = null;
  private _modalPreviewSprite: Sprite | null = null;
  private _modalBtnLabel: Label | null = null;
  private _onModalCloseCallback: (() => void) | null = null;

  // 飘字 Toast 气泡
  private _toastNode: Node | null = null;
  private _toastLabel: Label | null = null;

  onLoad() {
    this.autoBindDependencies();
  }

  start() {
    console.log('[GameManager] 启动星光琉璃工坊引擎...');
    this.autoBindDependencies();
    this.setupButtons();
    this.loadLevel(7);
  }

  private autoBindDependencies() {
    if (!this.gameBoard) {
      const gbNode = this.node.getChildByName('GameBoard');
      if (gbNode) {
        this.gameBoard = gbNode.getComponent(GameBoard) || gbNode.addComponent(GameBoard);
      }
    }
    if (!this.waterStream) {
      const wsNode = this.node.getChildByName('WaterStream');
      if (wsNode) {
        this.waterStream = wsNode.getComponent(WaterStream) || wsNode.addComponent(WaterStream);
      }
    }
    if (!this._shoppingBagsNode) {
      this._shoppingBagsNode = this.node.getChildByName('ShoppingBags');
    }
    if (!this._modeBannerNode) {
      this._modeBannerNode = this.node.getChildByName('ModeBanner');
    }

    this.setupHighFidelityHeader();
    this.setupHighFidelityFooter();
    this.setupHighFidelityBags();
    this.setupModalAndToast();

    if (this._modeBannerNode) {
      const txtNode = this._modeBannerNode.getChildByName('BannerText');
      this._modeBannerTextLabel = txtNode?.getComponent(Label) || null;
      const progNode = this._modeBannerNode.getChildByName('BannerProgress');
      this._modeBannerProgressLabel = progNode?.getComponent(Label) || null;
    }
  }

  /**
   * 100% 对标 HTML .top-bar 果冻琉璃导航栏
   */
  private setupHighFidelityHeader() {
    const header = this.node.getChildByName('Header');
    if (!header) return;

    header.setPosition(0, 550, 0);

    // 1. 左侧齿轮设置按钮 (BtnSettings)
    let btnSettings = header.getChildByName('BtnSettings');
    if (!btnSettings) {
      btnSettings = new Node('BtnSettings');
      btnSettings.layer = header.layer;
      btnSettings.setParent(header);
    }
    btnSettings.setPosition(-155, 0, 0);
    const setTrans = btnSettings.getComponent(UITransform) || btnSettings.addComponent(UITransform);
    setTrans.setContentSize(42, 42);
    const setSp = btnSettings.getComponent(Sprite) || btnSettings.addComponent(Sprite);
    setSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.btnSettings, (err, sf: SpriteFrame) => {
      if (!err && sf && setSp.isValid) setSp.spriteFrame = sf;
    });
    btnSettings.off(Node.EventType.TOUCH_END);
    btnSettings.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(btnSettings!);
      this.showToast('✨ 星光工坊荣誉：琉璃大师 200 关试炼进行中');
    });

    // 2. 右侧能量闪电按钮 (BtnPower)
    let btnPower = header.getChildByName('BtnPower');
    if (!btnPower) {
      btnPower = new Node('BtnPower');
      btnPower.layer = header.layer;
      btnPower.setParent(header);
    }
    btnPower.setPosition(155, 0, 0);
    const pwrTrans = btnPower.getComponent(UITransform) || btnPower.addComponent(UITransform);
    pwrTrans.setContentSize(42, 42);
    const pwrSp = btnPower.getComponent(Sprite) || btnPower.addComponent(Sprite);
    pwrSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.btnPower, (err, sf: SpriteFrame) => {
      if (!err && sf && pwrSp.isValid) pwrSp.spriteFrame = sf;
    });
    btnPower.off(Node.EventType.TOUCH_END);
    btnPower.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(btnPower!);
      this.handleQuickUnlockAll();
    });

    // 3. 中间琉璃发光圆角胶囊底座 (LevelPill)
    let pillNode = header.getChildByName('LevelPill');
    if (!pillNode) {
      pillNode = new Node('LevelPill');
      pillNode.layer = header.layer;
      pillNode.setParent(header);
      pillNode.setSiblingIndex(0);
    }
    pillNode.setPosition(0, 0, 0);
    const pillTrans = pillNode.getComponent(UITransform) || pillNode.addComponent(UITransform);
    pillTrans.setContentSize(136, 38);
    const pillSp = pillNode.getComponent(Sprite) || pillNode.addComponent(Sprite);
    pillSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.levelPill, (err, sf: SpriteFrame) => {
      if (!err && sf && pillSp.isValid) pillSp.spriteFrame = sf;
    });
    pillNode.off(Node.EventType.TOUCH_END);
    pillNode.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(pillNode!);
      this.handleNextLevelCheat();
    });

    // 4. 关卡文字置于胶囊中央
    let lblNode = header.getChildByName('LevelLabel');
    if (lblNode) {
      lblNode.setPosition(0, 0, 0);
      this._levelLabel = lblNode.getComponent(Label);
      if (this._levelLabel) {
        this._levelLabel.string = `第 ${this._currentLevelNum} 关`;
        this._levelLabel.fontSize = 17;
        this._levelLabel.lineHeight = 20;
        this._levelLabel.isBold = true;
      }
    }

    const movesNode = header.getChildByName('MovesLabel');
    this._movesLabel = movesNode?.getComponent(Label) || null;
    if (this._movesLabel) this._movesLabel.node.active = false;
  }

  /**
   * 100% 对标 HTML 底部 4 大道具栏带右上角果冻角标
   */
  private setupHighFidelityFooter() {
    const footer = this.node.getChildByName('Footer');
    if (!footer) return;

    footer.setPosition(0, -490, 0);

    const shuffleBtn = footer.getChildByName('BtnShuffle');
    if (shuffleBtn) {
      this.ensureButtonBadge(shuffleBtn, UI_ASSET_UUIDS.badgeRed1, 24, 22);
    }

    const addBtn = footer.getChildByName('BtnAddBottle');
    if (addBtn) {
      this.ensureButtonBadge(addBtn, UI_ASSET_UUIDS.badgeVideo, 26, 22);
    }

    const undoBtn = footer.getChildByName('BtnUndo');
    if (undoBtn) {
      this.ensureButtonBadge(undoBtn, UI_ASSET_UUIDS.badgeVideo, 26, 22);
    }
  }

  private ensureButtonBadge(btnNode: Node, uuid: string, w: number, h: number) {
    let badge = btnNode.getChildByName('JellyBadge');
    if (!badge) {
      badge = new Node('JellyBadge');
      badge.layer = btnNode.layer;
      badge.setParent(btnNode);
    }
    badge.setPosition(25, 25, 0);
    const trans = badge.getComponent(UITransform) || badge.addComponent(UITransform);
    trans.setContentSize(w, h);
    const sp = badge.getComponent(Sprite) || badge.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(uuid, (err, sf: SpriteFrame) => {
      if (!err && sf && sp.isValid) sp.spriteFrame = sf;
    });
  }

  /**
   * 100% 对标 HTML 顶部 4 个 3D 礼盒购物袋 (红、黄、蓝、视频)
   */
  private setupHighFidelityBags() {
    if (!this._shoppingBagsNode) return;
    this._shoppingBagsNode.setPosition(0, 415, 0);

    const bagConfigs = [
      { name: 'Bag_1_Yellow', x: -126, uuid: UI_ASSET_UUIDS.bagRed },
      { name: 'Bag_2_Purple', x: -42,  uuid: UI_ASSET_UUIDS.bagYellow },
      { name: 'Bag_3_Blue',   x: 42,   uuid: UI_ASSET_UUIDS.bagBlue },
      { name: 'Bag_4_Video',  x: 126,  uuid: UI_ASSET_UUIDS.bagVideo },
    ];

    bagConfigs.forEach((cfg) => {
      const node = this._shoppingBagsNode!.getChildByName(cfg.name);
      if (node) {
        node.setPosition(cfg.x, 0, 0);
        const trans = node.getComponent(UITransform) || node.addComponent(UITransform);
        trans.setContentSize(72, 90);
        const sp = node.getComponent(Sprite) || node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(cfg.uuid, (err, sf: SpriteFrame) => {
          if (!err && sf && sp.isValid) {
            sp.spriteFrame = sf;
            trans.setContentSize(72, 90);
          }
        });
      }
    });
  }

  /**
   * 构建商业级果冻玻璃弹窗与 Toast 气泡
   */
  private setupModalAndToast() {
    // 1. 遮罩层
    if (!this._modalMaskNode) {
      this._modalMaskNode = this.node.getChildByName('ModalMaskLayer');
      if (!this._modalMaskNode) {
        this._modalMaskNode = new Node('ModalMaskLayer');
        this._modalMaskNode.layer = this.node.layer;
        this._modalMaskNode.setParent(this.node);
        this._modalMaskNode.addComponent(BlockInputEvents);

        const trans = this._modalMaskNode.addComponent(UITransform);
        trans.setContentSize(750, 1334);
        const sp = this._modalMaskNode.addComponent(Sprite);
        sp.color = new Color(5, 10, 26, 195);
      }
      this._modalMaskNode.setPosition(0, 0, 0);
      this._modalMaskNode.active = false;
    }

    // 2. 玻璃卡片
    if (!this._modalCardNode && this._modalMaskNode) {
      this._modalCardNode = this._modalMaskNode.getChildByName('GlassJellyCard');
      if (!this._modalCardNode) {
        this._modalCardNode = new Node('GlassJellyCard');
        this._modalCardNode.layer = this.node.layer;
        this._modalCardNode.setParent(this._modalMaskNode);

        const cardTrans = this._modalCardNode.addComponent(UITransform);
        cardTrans.setContentSize(320, 420);
        const cardSp = this._modalCardNode.addComponent(Sprite);
        cardSp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(UI_ASSET_UUIDS.cardBg, (err, sf: SpriteFrame) => {
          if (!err && sf && cardSp.isValid) cardSp.spriteFrame = sf;
        });

        // 徽章
        const badgeNode = new Node('MechBadge');
        badgeNode.layer = this.node.layer;
        badgeNode.setParent(this._modalCardNode);
        badgeNode.setPosition(0, 160, 0);
        const badgeTrans = badgeNode.addComponent(UITransform);
        badgeTrans.setContentSize(160, 28);
        const badgeSp = badgeNode.addComponent(Sprite);
        badgeSp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(UI_ASSET_UUIDS.badgeGold, (err, sf: SpriteFrame) => {
          if (!err && sf && badgeSp.isValid) badgeSp.spriteFrame = sf;
        });
        const badgeLblNode = new Node('Label');
        badgeLblNode.layer = this.node.layer;
        badgeLblNode.setParent(badgeNode);
        this._modalBadgeLabel = badgeLblNode.addComponent(Label);
        this._modalBadgeLabel.fontSize = 11;
        this._modalBadgeLabel.lineHeight = 13;
        this._modalBadgeLabel.isBold = true;
        this._modalBadgeLabel.color = new Color(69, 26, 3, 255);

        // 标题
        const titleNode = new Node('Title');
        titleNode.layer = this.node.layer;
        titleNode.setParent(this._modalCardNode);
        titleNode.setPosition(0, 122, 0);
        this._modalTitleLabel = titleNode.addComponent(Label);
        this._modalTitleLabel.fontSize = 20;
        this._modalTitleLabel.lineHeight = 24;
        this._modalTitleLabel.isBold = true;
        this._modalTitleLabel.color = new Color(255, 255, 255, 255);

        // 副标题
        const subNode = new Node('Sub');
        subNode.layer = this.node.layer;
        subNode.setParent(this._modalCardNode);
        subNode.setPosition(0, 96, 0);
        this._modalSubLabel = subNode.addComponent(Label);
        this._modalSubLabel.fontSize = 12;
        this._modalSubLabel.lineHeight = 15;
        this._modalSubLabel.color = new Color(186, 230, 253, 230);

        // 展示台
        const pedNode = new Node('Pedestal');
        pedNode.layer = this.node.layer;
        pedNode.setParent(this._modalCardNode);
        pedNode.setPosition(0, 5, 0);
        const pedTrans = pedNode.addComponent(UITransform);
        pedTrans.setContentSize(96, 136);
        const pedSp = pedNode.addComponent(Sprite);
        pedSp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(UI_ASSET_UUIDS.pedestal, (err, sf: SpriteFrame) => {
          if (!err && sf && pedSp.isValid) pedSp.spriteFrame = sf;
        });

        const prevNode = new Node('PreviewBottle');
        prevNode.layer = this.node.layer;
        prevNode.setParent(pedNode);
        prevNode.setPosition(0, -4, 0);
        const prevTrans = prevNode.addComponent(UITransform);
        prevTrans.setContentSize(56, 120);
        this._modalPreviewSprite = prevNode.addComponent(Sprite);
        this._modalPreviewSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        tween(prevNode)
          .repeatForever(
            tween()
              .to(1.3, { position: new Vec3(0, 3, 0) }, { easing: 'sineInOut' })
              .to(1.3, { position: new Vec3(0, -5, 0) }, { easing: 'sineInOut' })
          )
          .start();

        // 规则说明框
        const ruleBox = new Node('RuleBox');
        ruleBox.layer = this.node.layer;
        ruleBox.setParent(this._modalCardNode);
        ruleBox.setPosition(0, -100, 0);
        const ruleTrans = ruleBox.addComponent(UITransform);
        ruleTrans.setContentSize(276, 56);
        const ruleSp = ruleBox.addComponent(Sprite);
        ruleSp.color = new Color(255, 255, 255, 28);

        const descNode = new Node('DescLabel');
        descNode.layer = this.node.layer;
        descNode.setParent(ruleBox);
        const descTrans = descNode.addComponent(UITransform);
        descTrans.setContentSize(262, 52);
        this._modalDescLabel = descNode.addComponent(Label);
        this._modalDescLabel.fontSize = 11.5;
        this._modalDescLabel.lineHeight = 15;
        this._modalDescLabel.overflow = Label.Overflow.CLAMP;
        this._modalDescLabel.color = new Color(240, 249, 255, 240);

        // 确定按钮
        const btnNode = new Node('ConfirmBtn');
        btnNode.layer = this.node.layer;
        btnNode.setParent(this._modalCardNode);
        btnNode.setPosition(0, -156, 0);
        const btnTrans = btnNode.addComponent(UITransform);
        btnTrans.setContentSize(248, 48);
        const btnSp = btnNode.addComponent(Sprite);
        btnSp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(UI_ASSET_UUIDS.btnPrimary, (err, sf: SpriteFrame) => {
          if (!err && sf && btnSp.isValid) btnSp.spriteFrame = sf;
        });

        const btnLblNode = new Node('BtnLabel');
        btnLblNode.layer = this.node.layer;
        btnLblNode.setParent(btnNode);
        this._modalBtnLabel = btnLblNode.addComponent(Label);
        this._modalBtnLabel.fontSize = 14;
        this._modalBtnLabel.lineHeight = 16;
        this._modalBtnLabel.isBold = true;
        this._modalBtnLabel.color = new Color(255, 255, 255, 255);
        this._modalBtnLabel.string = '领略奥秘，开启试炼 →';

        btnNode.on(Node.EventType.TOUCH_END, () => {
          this.closeModal();
        });
      }
      this._modalCardNode.setPosition(0, 20, 0);
    }

    // 3. Toast 气泡
    if (!this._toastNode) {
      this._toastNode = this.node.getChildByName('ToastBubble');
      if (!this._toastNode) {
        this._toastNode = new Node('ToastBubble');
        this._toastNode.layer = this.node.layer;
        this._toastNode.setParent(this.node);
        this._toastNode.setPosition(0, 320, 0);

        const trans = this._toastNode.addComponent(UITransform);
        trans.setContentSize(320, 36);
        const sp = this._toastNode.addComponent(Sprite);
        sp.color = new Color(30, 58, 138, 220);

        const lblNode = new Node('ToastLabel');
        lblNode.layer = this.node.layer;
        lblNode.setParent(this._toastNode);
        this._toastLabel = lblNode.addComponent(Label);
        this._toastLabel.fontSize = 12;
        this._toastLabel.lineHeight = 15;
        this._toastLabel.isBold = true;
        this._toastLabel.color = new Color(255, 255, 255, 255);
      }
      this._toastNode.active = false;
    }
  }

  public showMechanicIntro(key: string, onClose?: () => void) {
    this.setupModalAndToast();
    const info = MECHANIC_INTROS[key];
    if (!info || !this._modalMaskNode || !this._modalCardNode) return;

    this._onModalCloseCallback = onClose || null;

    if (this._modalBadgeLabel) this._modalBadgeLabel.string = info.badge || '✨ 琉璃工坊新典藏';
    if (this._modalTitleLabel) this._modalTitleLabel.string = info.title || '';
    if (this._modalSubLabel) this._modalSubLabel.string = info.sub || '';
    if (this._modalDescLabel) {
      this._modalDescLabel.string = info.desc.replace(/<[^>]+>/g, '');
    }
    if (this._modalBtnLabel) this._modalBtnLabel.string = '领略奥秘，开启试炼 →';

    if (this._modalPreviewSprite) {
      let previewUuid = UI_ASSET_UUIDS.tubeGlass;
      if (key === 'silk_drape') previewUuid = UI_ASSET_UUIDS.silkDrape;
      else if (key === 'giant_cat') previewUuid = UI_ASSET_UUIDS.giantCat;
      else if (key === 'ice_base') previewUuid = UI_ASSET_UUIDS.iceBase;

      assetManager.loadAny(previewUuid, (err, sf: SpriteFrame) => {
        if (!err && sf && this._modalPreviewSprite && this._modalPreviewSprite.isValid) {
          this._modalPreviewSprite.spriteFrame = sf;
        }
      });
    }

    this._modalMaskNode.active = true;
    this._modalCardNode.setScale(new Vec3(0.75, 0.75, 1));
    tween(this._modalCardNode)
      .to(0.24, { scale: new Vec3(1.04, 1.04, 1) }, { easing: 'quadOut' })
      .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineOut' })
      .start();
  }

  public showWinModal(onNext?: () => void) {
    this.setupModalAndToast();
    if (!this._modalMaskNode || !this._modalCardNode) return;

    this._onModalCloseCallback = onNext || null;

    if (this._modalBadgeLabel) this._modalBadgeLabel.string = `🏆 试炼通关 · LV.${this._currentLevelNum}`;
    if (this._modalTitleLabel) this._modalTitleLabel.string = '🎉 凝萃圆满 · 大获全胜';
    if (this._modalSubLabel) this._modalSubLabel.string = '同色秘药尽数落塞封存 · 获得星光认可';
    if (this._modalDescLabel) this._modalDescLabel.string = '✨ 宗师技艺非凡！秘药纯度达到 100%，已收录入星光工坊典藏史册。';
    if (this._modalBtnLabel) this._modalBtnLabel.string = '开启下一试炼 →';

    if (this._modalPreviewSprite) {
      assetManager.loadAny(UI_ASSET_UUIDS.tubeGlass, (err, sf: SpriteFrame) => {
        if (!err && sf && this._modalPreviewSprite && this._modalPreviewSprite.isValid) {
          this._modalPreviewSprite.spriteFrame = sf;
        }
      });
    }

    this._modalMaskNode.active = true;
    this._modalCardNode.setScale(new Vec3(0.75, 0.75, 1));
    tween(this._modalCardNode)
      .to(0.25, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
      .to(0.1, { scale: new Vec3(1.0, 1.0, 1) })
      .start();
  }

  public closeModal() {
    if (!this._modalMaskNode || !this._modalCardNode) return;

    tween(this._modalCardNode)
      .to(0.16, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadIn' })
      .call(() => {
        if (this._modalMaskNode) this._modalMaskNode.active = false;
        if (this._onModalCloseCallback) {
          const cb = this._onModalCloseCallback;
          this._onModalCloseCallback = null;
          cb();
        }
      })
      .start();
  }

  public showToast(msg: string) {
    this.setupModalAndToast();
    if (!this._toastNode || !this._toastLabel) return;

    this._toastLabel.string = msg;
    this._toastNode.active = true;
    this._toastNode.setScale(new Vec3(0.85, 0.85, 1));
    tween(this._toastNode).stop();

    tween(this._toastNode)
      .to(0.18, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
      .to(0.1, { scale: new Vec3(1.0, 1.0, 1) })
      .delay(1.8)
      .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
      .call(() => {
        if (this._toastNode) this._toastNode.active = false;
      })
      .start();
  }

  private setupButtons() {
    const footer = this.node.getChildByName('Footer');
    if (!footer) return;

    // 1. 提示按钮
    const shuffleBtn = footer.getChildByName('BtnShuffle');
    if (shuffleBtn) {
      shuffleBtn.off(Node.EventType.TOUCH_END);
      shuffleBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(shuffleBtn);
        this.handleShuffle();
      });
    }

    // 2. +空瓶/破除封印按钮
    let addBtn = footer.getChildByName('BtnAddBottle');
    if (addBtn) {
      addBtn.off(Node.EventType.TOUCH_END);
      addBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(addBtn);
        this.handleAddBottle();
      });
    }

    // 3. 关卡选择按钮
    let levelBtn = footer.getChildByName('BtnLevel');
    if (levelBtn) {
      levelBtn.off(Node.EventType.TOUCH_END);
      levelBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(levelBtn);
        this.handleNextLevelCheat();
      });
    }

    // 4. 撤回按钮
    const undoBtn = footer.getChildByName('BtnUndo');
    if (undoBtn) {
      undoBtn.off(Node.EventType.TOUCH_END);
      undoBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(undoBtn);
        this.handleUndo();
      });
    }
  }

  private bounceButton(btnNode: Node) {
    tween(btnNode)
      .to(0.08, { scale: new Vec3(0.88, 0.88, 1) })
      .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  public loadLevel(levelNum: number) {
    this._currentLevelNum = Math.max(1, Math.min(200, levelNum));
    this._currentCfg = getLevelConfig(this._currentLevelNum);
    console.log(`[GameManager] 加载试炼：${this._currentCfg.title} (${this._currentCfg.shortTag})`);

    this._bottles = this._currentCfg.bottles();
    this._bags = this._currentCfg.hasBags ? JSON.parse(JSON.stringify(this._currentCfg.bags)) : [];
    this._packedTotal = 0;
    this._pourCountTotal = 0;
    this._remainingMoves = this._currentCfg.moveLimit;
    this._history = [];
    this._selectedIndex = null;
    this._isBusy = false;

    // 1. 顶部标题刷新
    if (this._levelLabel) {
      this._levelLabel.string = `第 ${this._currentLevelNum} 关`;
    }
    this.updateMovesDisplay();

    // 2. 双模式 UI 切换
    if (this._shoppingBagsNode) {
      this._shoppingBagsNode.active = !!this._currentCfg.hasBags;
    }
    if (this._modeBannerNode) {
      this._modeBannerNode.active = !this._currentCfg.hasBags;
    }
    this.updateModeBanner();

    // 3. 商业级新玩法/新机关登场弹窗 (对标 HTML 图 2)
    const introKey = this._currentCfg.introMechanicKey;
    if (introKey && !this._shownIntros.has(introKey)) {
      this._shownIntros.add(introKey);
      this.showMechanicIntro(introKey);
    }

    // 4. 棋盘瓶子初始化
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
  }

  private updateMovesDisplay() {
    if (!this._movesLabel) return;
    if (this._remainingMoves !== null) {
      this._movesLabel.node.active = true;
      this._movesLabel.string = `✨ 步数 ${this._remainingMoves}`;
    } else {
      this._movesLabel.node.active = false;
    }
  }

  private updateModeBanner() {
    if (!this._currentCfg || this._currentCfg.hasBags) return;

    if (this._currentCfg.isCatBossLevel) {
      const catBottle = this._bottles.find((b) => b.isGiantCat);
      const curLayers = catBottle ? catBottle.layers.length : 0;
      const catColName = COLORS[(catBottle && catBottle.catTargetColor) || 'pink'].name;
      if (this._modeBannerTextLabel) {
        this._modeBannerTextLabel.string = `🐱 皇家典藏：请将 8 层【${catColName}】汇入中央灵猫水晶瓶`;
      }
      if (this._modeBannerProgressLabel) {
        this._modeBannerProgressLabel.string = `凝萃 ${curLayers}/8`;
      }
    } else {
      const corkedCnt = this._bottles.filter((b) => b.corked).length;
      const totalTargets = this._bottles.filter((b) => b.layers.length > 0).length;
      if (this._modeBannerTextLabel) {
        this._modeBannerTextLabel.string = `✨ 琉璃工坊：凝萃同色秘药，满瓶即落原木塞封存`;
      }
      if (this._modeBannerProgressLabel) {
        this._modeBannerProgressLabel.string = `封存 ${corkedCnt}/${totalTargets}`;
      }
    }
  }

  private cloneState(): MoveHistoryItem {
    return {
      bottles: JSON.parse(JSON.stringify(this._bottles)),
      bags: JSON.parse(JSON.stringify(this._bags)),
      packedTotal: this._packedTotal,
      pourCountTotal: this._pourCountTotal,
      remainingMoves: this._remainingMoves,
      shuffleUses: 1,
    };
  }

  public async handleTubeClick(index: number) {
    if (this._isBusy) return;
    const bottle = this._bottles[index];
    if (!bottle || bottle.removed || bottle.corked) return;

    // 1. 摄像机广告空瓶解锁
    if (bottle.special === 'ad_cam' || bottle.special === 'ad_cam_blue') {
      this._history.push(this.cloneState());
      bottle.special = 'none';
      const tube = this.gameBoard.getTube(index);
      if (tube) tube.updateBadgeState();
      this.showToast(`🎬 激励视频辅助：已免费开启第 ${index + 1} 号备用瓶！`);
      return;
    }

    // 2. 首选瓶子提起
    if (this._selectedIndex === null) {
      if (canSelectBottle(bottle, (msg) => this.showToast(msg))) {
        this._selectedIndex = index;
        const tube = this.gameBoard.getTube(index);
        if (tube) tube.setSelected(true);
      }
      return;
    }

    // 3. 点击同一瓶放下
    if (this._selectedIndex === index) {
      const tube = this.gameBoard.getTube(index);
      if (tube) tube.setSelected(false);
      this._selectedIndex = null;
      return;
    }

    // 4. 执行倒水判定
    const srcIndex = this._selectedIndex;
    const dstIndex = index;
    const srcBottle = this._bottles[srcIndex];
    const dstBottle = this._bottles[dstIndex];

    if (!canPourInto(srcBottle, dstBottle)) {
      const srcTube = this.gameBoard.getTube(srcIndex);
      if (srcTube) srcTube.setSelected(false);

      if (canSelectBottleNoToast(dstBottle)) {
        this._selectedIndex = dstIndex;
        const newTube = this.gameBoard.getTube(dstIndex);
        if (newTube) newTube.setSelected(true);
      } else {
        this._selectedIndex = null;
      }
      return;
    }

    // 5. 倒水执行
    this._isBusy = true;
    this._history.push(this.cloneState());

    const pourUnits = getPourableCount(srcBottle, dstBottle);
    const movingColor = srcBottle.layers[srcBottle.layers.length - 1];

    const srcTube = this.gameBoard.getTube(srcIndex);
    const dstTube = this.gameBoard.getTube(dstIndex);

    if (srcTube && dstTube) {
      // A. 悬停并倾斜
      const dstWorldPos = dstTube.node.worldPosition;
      await srcTube.playPourTo(dstWorldPos, 0.45);

      // B. 抛物线水流注水
      if (this.waterStream) {
        const streamStart = new Vec3(
          srcTube.node.position.x + (srcTube.node.position.x < dstTube.node.position.x ? 28 : -28),
          srcTube.node.position.y + 68,
          0
        );
        const streamEnd = new Vec3(dstTube.node.position.x, dstTube.node.position.y + 35, 0);
        this.waterStream.startPour(streamStart, streamEnd, movingColor, 0.42);
      }

      // C. 流体体积同步
      await Promise.all([
        srcTube.animateDrainTopLayer(pourUnits, 0.42),
        dstTube.animateRiseNewLayer(movingColor, pourUnits, 0.42),
      ]);

      if (this.waterStream) {
        this.waterStream.stopPour();
      }

      // D. 回正归位
      await srcTube.playReturn();
    }

    // E. 数据更新
    for (let u = 0; u < pourUnits; u++) {
      srcBottle.layers.pop();
      dstBottle.layers.push(movingColor);
    }
    this._pourCountTotal++;
    if (this._remainingMoves !== null) {
      this._remainingMoves = Math.max(0, this._remainingMoves - 1);
      this.updateMovesDisplay();
    }

    // 破雾盲盒揭晓
    if (srcBottle.mysteryCount && srcBottle.mysteryCount > 0 && srcBottle.layers.length <= srcBottle.mysteryCount) {
      srcBottle.mysteryCount = Math.max(0, srcBottle.layers.length - 1);
      this.showToast('✨ 金芒破雾：神秘盲盒秘药已显露真彩！');
    }

    // 倾倒共振解冻霜晶底座
    for (const b of this._bottles) {
      if (b.special === 'ice_base' && b.poursRemaining && b.poursRemaining > 0) {
        b.poursRemaining--;
        if (b.poursRemaining === 0) {
          b.special = 'none';
          this.showToast('🧊 倾倒共振：极地霜晶底座已震碎破冰！');
        }
      }
    }

    // 刷新棋盘视图
    if (srcTube) srcTube.init(srcIndex, srcBottle);
    if (dstTube) dstTube.init(dstIndex, dstBottle);

    // 判定满瓶落塞封存
    if (isCompleteBottle(dstBottle)) {
      dstBottle.corked = true;
      if (dstTube) {
        await dstTube.playCorkDropAnimation();
      }
      this.showToast(`🎉 满瓶封存：整瓶【${COLORS[movingColor].name}】已落塞入库！`);

      // 礼盒契约解除星缎礼袍
      this._packedTotal++;
      this.unlockBagOrderObstacles();
    }

    this._selectedIndex = null;
    this._isBusy = false;

    // 胜负判定
    if (checkGameWon(this._bottles)) {
      console.log('🎉 恭喜达成全部目标，工坊试炼通关！');
      this.showWinModal(() => {
        this.loadLevel(this._currentLevelNum + 1);
      });
    }
  }

  private unlockBagOrderObstacles() {
    for (const b of this._bottles) {
      if (!b.removed && ['silk_drape', 'full_ice', 'paper_bag'].includes(b.special) && this._packedTotal >= (b.unlockOrder || 1)) {
        const prevSpec = b.special;
        b.special = 'none';
        const msg = prevSpec === 'silk_drape' ? '🧣 礼盒契约达成：星缎礼袍已揭幕！' : '🛍️ 礼盒契约达成：羊皮礼袋已解封！';
        console.log(`[GameManager] ${msg}`);
        this.showToast(msg);
      }
    }
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
  }

  private handleQuickUnlockAll() {
    this._history.push(this.cloneState());
    for (const b of this._bottles) {
      if (b.special === 'silk_drape' || b.special === 'full_ice' || b.special === 'paper_bag') {
        b.special = 'none';
      }
      if (b.poursRemaining) b.poursRemaining = 0;
      if (b.mysteryCount) b.mysteryCount = 0;
    }
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
    this.showToast('⚡ 闪电神威：全场星缎礼袍、冰雕与盲盒已全部解除！');
  }

  private handleShuffle() {
    this.showToast('💡 智能提示：请尝试腾挪浅色药水汇入空瓶');
  }

  private handleAddBottle() {
    this.showToast('🎬 看广告免费+1备用空瓶');
  }

  private handleUndo() {
    if (this._history.length === 0) {
      this.showToast('⚠️ 当前无已走步数可供撤回');
      return;
    }
    const last = this._history.pop()!;
    this._bottles = last.bottles;
    this._bags = last.bags;
    this._packedTotal = last.packedTotal;
    this._pourCountTotal = last.pourCountTotal;
    this._remainingMoves = last.remainingMoves;
    this._selectedIndex = null;
    this._isBusy = false;

    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
    this.updateModeBanner();
    this.updateMovesDisplay();
    this.showToast('↺ 已撤回上一步');
  }

  public handleNextLevelCheat() {
    const nextLv = this._currentLevelNum >= 10 ? 1 : this._currentLevelNum + 1;
    this.loadLevel(nextLv);
  }
}
