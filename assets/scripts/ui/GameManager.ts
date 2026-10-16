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
  releaseObsoleteColorLocks,
  findBestPourMove,
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
  btnUndo: '3f267627-88c1-4bc6-a4ba-d2dccfba2090@f9941',
  btnShuffle: 'b591d898-4c40-476b-b280-536fa9c0d5b5@f9941',
  btnAddBottle: '21560661-655f-46e2-8805-ca9d1ed4f47d@f9941',
  btnLevel: 'a9ea2da3-f9d8-4558-b2e8-b78298b5d56e@f9941',
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
  fontFredoka: 'd4a89601-3882-4aa1-92be-b1e600a01001',
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
  private _bigNumLabel: Label | null = null;
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
    setTrans.setContentSize(48, 48);
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
    pwrTrans.setContentSize(48, 48);
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

    // 3. 顶部中央大字号艺术数字与副标题 (100% 对齐 demo/v2.html .zen-big-num & .level-pill)
    let centerGroup = header.getChildByName('CenterGroup');
    if (!centerGroup) {
      centerGroup = new Node('CenterGroup');
      centerGroup.layer = header.layer;
      centerGroup.setParent(header);
      centerGroup.setPosition(0, 0, 0);
    }

    // A. 上方纯白立体艺术大字 (100% 对标 v5: "第 X 关")
    let bigNumNode = centerGroup.getChildByName('BigNum');
    if (!bigNumNode) {
      bigNumNode = new Node('BigNum');
      bigNumNode.layer = header.layer;
      bigNumNode.setParent(centerGroup);
      const trans = bigNumNode.addComponent(UITransform);
      trans.setContentSize(160, 32);
      this._bigNumLabel = bigNumNode.addComponent(Label);
      this._bigNumLabel.fontSize = 34;
      this._bigNumLabel.lineHeight = 36;
      this._bigNumLabel.isBold = true;
      this._bigNumLabel.color = new Color(255, 255, 255, 255);
      assetManager.loadAny(UI_ASSET_UUIDS.fontFredoka, (err, font: any) => {
        if (!err && font && this._bigNumLabel?.isValid) {
          this._bigNumLabel.font = font;
        }
      });
    } else {
      this._bigNumLabel = bigNumNode.getComponent(Label);
      if (this._bigNumLabel) {
        this._bigNumLabel.fontSize = 34;
        this._bigNumLabel.lineHeight = 36;
      }
    }
    bigNumNode.setPosition(0, 10, 0);

    // B. 下方副标题胶囊 (100% 对标 v5: "已封存 0/X" / "剩余步数 X")
    let subtitleNode = centerGroup.getChildByName('Subtitle');
    if (!subtitleNode) {
      subtitleNode = new Node('Subtitle');
      subtitleNode.layer = header.layer;
      subtitleNode.setParent(centerGroup);
      const trans = subtitleNode.addComponent(UITransform);
      trans.setContentSize(150, 26);
      
      const pillSp = subtitleNode.addComponent(Sprite);
      pillSp.sizeMode = Sprite.SizeMode.CUSTOM;
      assetManager.loadAny(UI_ASSET_UUIDS.levelPill, (err, sf) => {
        if (!err && sf && pillSp.isValid) pillSp.spriteFrame = sf;
      });

      const lblNode = new Node('Label');
      lblNode.layer = header.layer;
      lblNode.setParent(subtitleNode);
      this._levelLabel = lblNode.addComponent(Label);
      this._levelLabel.fontSize = 12;
      this._levelLabel.lineHeight = 14;
      this._levelLabel.isBold = true;
      this._levelLabel.color = new Color(255, 255, 255, 255);
    } else {
      this._levelLabel = subtitleNode.getComponentInChildren(Label);
    }
    subtitleNode.setPosition(0, -18, 0);

    // 点击中央区域可切换测试下一关
    centerGroup.off(Node.EventType.TOUCH_END);
    centerGroup.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(centerGroup!);
      this.handleNextLevelCheat();
    });

    // 隐藏废弃节点
    const oldPill = header.getChildByName('LevelPill');
    if (oldPill) oldPill.active = false;
    const oldLbl = header.getChildByName('LevelLabel');
    if (oldLbl) oldLbl.active = false;
    const oldMoves = header.getChildByName('MovesLabel');
    if (oldMoves) oldMoves.active = false;
  }
  private setupHighFidelityFooter() {
    const footer = this.node.getChildByName('Footer');
    if (!footer) return;

    footer.setPosition(0, -490, 0);

    const btnConfigs = [
      { name: 'BtnShuffle', uuid: UI_ASSET_UUIDS.btnShuffle },
      { name: 'BtnAddBottle', uuid: UI_ASSET_UUIDS.btnAddBottle },
      { name: 'BtnUndo', uuid: UI_ASSET_UUIDS.btnUndo },
    ];

    btnConfigs.forEach((cfg) => {
      const btn = footer.getChildByName(cfg.name);
      if (btn) {
        const trans = btn.getComponent(UITransform) || btn.addComponent(UITransform);
        trans.setContentSize(58, 58);
        const sp = btn.getComponent(Sprite) || btn.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(cfg.uuid, (err, sf: SpriteFrame) => {
          if (!err && sf && sp.isValid) {
            sp.spriteFrame = sf;
            trans.setContentSize(58, 58);
          }
        });
        this.ensureButtonBadge(btn, UI_ASSET_UUIDS.badgeGold, 22, 22);
      }
    });
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
    if (this._bigNumLabel) {
      if (this._remainingMoves !== null) {
        this._bigNumLabel.string = `${this._remainingMoves}`;
      } else {
        this._bigNumLabel.string = `${this._currentLevelNum}`;
      }
    }
    if (this._levelLabel) {
      const tag = this._currentCfg?.shortTag || this._currentCfg?.title || `第 ${this._currentLevelNum} 关`;
      this._levelLabel.string = this._remainingMoves !== null ? `步数 · ${tag}` : `第 ${this._currentLevelNum} 关 · ${tag}`;
    }

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

      const pourColor = srcBottle.layers[srcBottle.layers.length - 1];
      if (dstBottle.frozenTurns && dstBottle.frozenTurns > 0) {
        this.showToast(`🧊 目标瓶口已被寒冰封印，还需 ${dstBottle.frozenTurns} 步自动解封！`);
      } else if (dstBottle.special === 'one_way_out') {
        this.showToast('⏫ 单向源泉古瓶：仅可向外倾倒，不可注入秘药！');
      } else if (dstBottle.special === 'color_lock' && dstBottle.requiredColor && pourColor !== dstBottle.requiredColor) {
        const reqObj = COLORS[dstBottle.requiredColor] || COLORS.blue;
        this.showToast(`🔒 此瓶只能倒入【${reqObj.name}】！`);
      }

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
      // 100% 对齐 v7.html：步数更新时「第 X 关」文字保持绝对稳固静止
    }

    // 破雾盲盒揭晓
    if (srcBottle.mysteryCount && srcBottle.mysteryCount > 0 && srcBottle.layers.length <= srcBottle.mysteryCount) {
      srcBottle.mysteryCount = Math.max(0, srcBottle.layers.length - 1);
      this.showToast('✨ 金芒破雾：神秘盲盒秘药已显露真彩！');
    }

    // A. 检查单向出水古瓶 (one_way_out) 是否已排空 -> 腾出空间消散
    if (srcBottle.special === 'one_way_out' && srcBottle.layers.length === 0) {
      srcBottle.removed = true;
      srcBottle.countdownMoves = null;
      if (srcTube) {
        await srcTube.playVanishAnimation();
      }
      this.showToast('⏫ 单向古瓶已全部倾注完毕，化作星光腾出桌面！');
    }

    // B. 检查源瓶或目标瓶上的星砂流沙炸弹 (countdownMoves) 是否解除
    if (srcBottle.countdownMoves && srcBottle.countdownMoves > 0 && srcBottle.layers.length === 0) {
      srcBottle.countdownMoves = null;
      this.showToast('⏳ 源瓶已倒空，流沙倒计时危机解除！');
    }
    if (dstBottle.countdownMoves && dstBottle.countdownMoves > 0 && isCompleteBottle(dstBottle)) {
      dstBottle.countdownMoves = null;
      this.showToast('⏳ 满瓶落塞封存，流沙倒计时危机解除！');
    }

    // C. v8 策略机关精密结算：
    //    - 冰晶凝霜瓶 (ice_base)：唯有【直接向该冰瓶注入同色】或【场上凑满封存整瓶】时才消融 1 层
    //    - 鎏金锁扣瓶 (stone_base)：唯有【场上凑满封存整瓶】或【将该瓶自身凑满】时才崩解 1 层
    const dstWillCompleteNow = isCompleteBottle(dstBottle);

    for (let bIdx = 0; bIdx < this._bottles.length; bIdx++) {
      const b = this._bottles[bIdx];
      if (b.removed || b.corked) continue;

      // 冰晶凝霜瓶判定
      if (b.special === 'ice_base') {
        const pours = b.poursRemaining ?? b.poursToBreak ?? 1;
        const directThermalHit = (bIdx === dstIndex);
        if (directThermalHit || dstWillCompleteNow) {
          const nextPours = (directThermalHit && dstWillCompleteNow) ? 0 : Math.max(0, pours - 1);
          b.poursRemaining = nextPours;
          b.poursToBreak = nextPours;
          if (nextPours === 0) {
            b.special = 'none';
            this.showToast('🧊 冰晶完全消融，该瓶已恢复自由出水！');
          } else {
            this.showToast(`❄️ 冰晶正在消融！还需注入或满瓶 ${nextPours} 次`);
          }
        }
      } else if (b.special === 'stone_base') {
        // 鎏金锁扣瓶判定
        const pours = b.poursRemaining ?? b.poursToBreak ?? 1;
        if (dstWillCompleteNow || (bIdx === dstIndex && dstBottle.layers.length === (dstBottle.maxCap || 4))) {
          const nextPours = (bIdx === dstIndex && dstWillCompleteNow) ? 0 : Math.max(0, pours - 1);
          b.poursRemaining = nextPours;
          b.poursToBreak = nextPours;
          if (nextPours === 0) {
            b.special = 'none';
            this.showToast('🔒 鎏金锁扣崩解，该瓶已恢复出水！');
          } else {
            this.showToast(`🔒 鎏金锁扣松动！还需封存 ${nextPours} 瓶药水`);
          }
        }
      }

      // 冰封瓶口递减
      if (b.frozenTurns && b.frozenTurns > 0) {
        b.frozenTurns--;
        if (b.frozenTurns === 0) {
          this.showToast('❄️ 瓶口寒冰消融，已恢复注入状态！');
        }
      } else if (typeof b.countdownMoves === 'number' && b.countdownMoves > 0) {
        if (b.layers.length === 0) {
          b.countdownMoves = null;
        } else {
          b.countdownMoves--;
          if (b.countdownMoves <= 0) {
            b.countdownMoves = null;
            b.frozenTurns = 3;
            this.showToast('⚠️ 流沙倒计时归零！瓶口已被寒冰封印 3 步！');
          }
        }
      }
    }

    // 判定满瓶落塞封存
    if (isCompleteBottle(dstBottle)) {
      dstBottle.corked = true;
      releaseObsoleteColorLocks(this._bottles);
      if (dstTube) {
        await dstTube.playCorkDropAnimation();
      }
      // 100% 对齐 v7.html：满瓶时能量注入瓶底麻布软垫点亮金星，大标题保持静止稳固
      this.showToast(`🎉 满瓶封存：整瓶【${COLORS[movingColor].name}】已落塞入库！`);

      // 礼盒契约解除星缎礼袍
      this._packedTotal++;
      this.unlockBagOrderObstacles();
    }

    // 刷新棋盘上所有试管状态
    for (let i = 0; i < this._bottles.length; i++) {
      const t = this.gameBoard.getTube(i);
      if (t) t.init(i, this._bottles[i]);
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
      if (['silk_drape', 'full_ice', 'paper_bag', 'color_lock', 'ice_base', 'stone_base'].includes(b.special)) {
        b.special = 'none';
      }
      b.requiredColor = null;
      b.poursToBreak = 0;
      b.poursRemaining = 0;
      b.mysteryCount = 0;
      b.countdownMoves = null;
      b.frozenTurns = 0;
    }
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
    this.showToast('⚡ 闪电神威：全场星缎、冰雕、色环锁、流沙炸弹与盲盒已全部解除！');
  }

  private handleShuffle() {
    if (this._isBusy) return;
    const bestMove = findBestPourMove(this._bottles);
    if (bestMove) {
      const srcTube = this.gameBoard.getTube(bestMove.srcIdx);
      const dstTube = this.gameBoard.getTube(bestMove.dstIdx);
      if (this._selectedIndex !== null) {
        const prev = this.gameBoard.getTube(this._selectedIndex);
        if (prev) prev.setSelected(false);
      }
      this._selectedIndex = bestMove.srcIdx;
      if (srcTube) srcTube.setSelected(true);
      const movingColor = this._bottles[bestMove.srcIdx].layers[this._bottles[bestMove.srcIdx].layers.length - 1];
      const colName = COLORS[movingColor]?.name || '药水';
      this.showToast(`💡 智能推演：将第 ${bestMove.srcIdx + 1} 瓶【${colName}】倒入第 ${bestMove.dstIdx + 1} 瓶！`);
    } else {
      this.showToast('⚠️ 当前桌面暂无直接可倒步骤，建议点击【+空瓶】或【撤回】！');
    }
  }

  private handleAddBottle() {
    this._history.push(this.cloneState());

    // 1. 步数危急救急：若步数限制 <= 3 步，优先增加 5 步
    if (this._remainingMoves !== null && this._remainingMoves <= 3) {
      this._remainingMoves += 5;
      this.updateMovesDisplay();
      this.playBigNumPulse(true);
      this.spawnFloatDelta("+5步", "#fde047");
      this.showToast('🎬 激励辅助奖励：已为您增加 +5 步！');
      return;
    }

    // 2. 优先解除流沙超时寒冰封口或流沙炸弹倒计时
    const frozenOrBomb = this._bottles.find(
      (b) => !b.removed && !b.corked && ((b.frozenTurns && b.frozenTurns > 0) || (b.countdownMoves && b.countdownMoves > 0))
    );
    if (frozenOrBomb) {
      const wasFrozen = !!(frozenOrBomb.frozenTurns && frozenOrBomb.frozenTurns > 0);
      frozenOrBomb.frozenTurns = 0;
      frozenOrBomb.countdownMoves = null;
      for (let i = 0; i < this._bottles.length; i++) {
        const t = this.gameBoard.getTube(i);
        if (t) t.init(i, this._bottles[i]);
      }
      this.showToast(wasFrozen ? '❄️ 辅助特权：已为您立即震碎瓶口寒冰封印！' : '⏳ 辅助特权：已为您立即拆除星砂流沙炸弹！');
      return;
    }

    // 3. 优先解锁场上的激励视频备用空瓶 (ad_cam / ad_cam_blue)
    const camBottle = this._bottles.find((b) => !b.removed && (b.special === 'ad_cam' || b.special === 'ad_cam_blue'));
    if (camBottle) {
      camBottle.special = 'none';
      for (let i = 0; i < this._bottles.length; i++) {
        const t = this.gameBoard.getTube(i);
        if (t) t.init(i, this._bottles[i]);
      }
      this.showToast('🎬 辅助特权：已为您免费解锁 +1 备用琉璃空瓶！');
      return;
    }

    // 4. 优先解除一处特殊障碍（冰座、石座、星缎、盲盒等）
    const obstacleBottle = this._bottles.find(
      (b) => !b.removed && !b.corked && (b.special !== 'none' || (b.mysteryCount && b.mysteryCount > 0))
    );
    if (obstacleBottle) {
      if (obstacleBottle.special !== 'none') {
        obstacleBottle.special = 'none';
        obstacleBottle.requiredColor = null;
        obstacleBottle.poursToBreak = 0;
        obstacleBottle.poursRemaining = 0;
        for (let i = 0; i < this._bottles.length; i++) {
          const t = this.gameBoard.getTube(i);
          if (t) t.init(i, this._bottles[i]);
        }
        this.showToast('✨ 辅助特权：已为您直接化解一处特殊障碍！');
      } else {
        obstacleBottle.mysteryCount = 0;
        for (let i = 0; i < this._bottles.length; i++) {
          const t = this.gameBoard.getTube(i);
          if (t) t.init(i, this._bottles[i]);
        }
        this.showToast('✨ 辅助特权：已为您驱散一整瓶星雾盲盒！');
      }
      return;
    }

    // 5. 原地复用已消散古瓶或已入库留下的空槽位 (b.removed === true)，防止撑破 2x6 棋盘
    const removedSlot = this._bottles.find((b) => b.removed);
    if (removedSlot) {
      removedSlot.removed = false;
      removedSlot.corked = false;
      removedSlot.maxCap = 4;
      removedSlot.layers = [];
      removedSlot.special = 'none';
      removedSlot.requiredColor = null;
      removedSlot.mysteryCount = 0;
      removedSlot.countdownMoves = null;
      removedSlot.frozenTurns = 0;
      for (let i = 0; i < this._bottles.length; i++) {
        const t = this.gameBoard.getTube(i);
        if (t) t.init(i, this._bottles[i]);
      }
      this.showToast('➕ 辅助特权：已在空缺槽位为您补充 +1 标准琉璃空瓶！');
      return;
    }

    // 6. 若场上瓶数未达上限，额外陈列 1 瓶
    if (this._bottles.length < 14) {
      this._bottles.push({
        id: this._bottles.length,
        maxCap: 4,
        layers: [],
        special: 'none',
      });
      if (this.gameBoard) {
        this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
      }
      this.showToast('➕ 辅助特权：已为您额外陈列 +1 备用琉璃空瓶！');
    } else {
      this.showToast('💡 当前桌面器皿已满，建议点击【提示】或【撤回】！');
    }
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

  /**
   * 100% 对齐 demo/v3.html: 满瓶金辉脉冲 (zenSealBurstAnim) 与步进弹跳 (zenStepTickAnim)
   */
  private playBigNumPulse(isSealBurst: boolean = false) {
    if (!this._bigNumLabel) return;
    // 100% 对齐 v7.html 最新要求：步数扣减或日常操作时保持「第 X 关」文字绝对稳固静止不动
    if (!isSealBurst) return;

    const n = this._bigNumLabel.node;
    tween(n).stop();
    n.setScale(Vec3.ONE);
    tween(n)
      .to(0.18, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
      .to(0.22, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'quadOut' })
      .start();
  }

  /**
   * 100% 对齐 demo/v3.html: 大数字旁飘起浮字 (+1 / -1 / +5)
   */
  private spawnFloatDelta(text: string, colHex: string = '#fff8a6') {
    if (!this._bigNumLabel) return;
    const parentNode = this._bigNumLabel.node.parent || this._bigNumLabel.node;
    const floatNode = new Node('FloatDelta');
    floatNode.layer = parentNode.layer;
    floatNode.setParent(parentNode);
    floatNode.setPosition(45, 14, 0);

    const lbl = floatNode.addComponent(Label);
    lbl.string = text;
    lbl.fontSize = 16;
    lbl.lineHeight = 18;
    lbl.isBold = true;
    lbl.color = Color.fromHEX(new Color(), colHex);

    tween(floatNode)
      .to(0.20, { position: new Vec3(45, 20, 0), scale: new Vec3(1.15, 1.15, 1) })
      .to(0.50, { position: new Vec3(45, 34, 0), scale: new Vec3(0.9, 0.9, 1) })
      .call(() => floatNode.destroy())
      .start();
  }

}
