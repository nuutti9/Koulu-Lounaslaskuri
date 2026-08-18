import { NextRequest, NextResponse } from 'next/server';
import jamixMenus from '../../../../public/jamix_menus.json';

export const dynamic = 'force-dynamic';

type SchoolConfig = {
  id: string;
  name: string;
  customer: string;
  kitchen: string;
  menu: string;
  provider?: 'aromi' | 'jamix';
};

type Macros = {
  kcal: number;
  p: number;
  h: number;
  r: number;
};

type JamixCachedMeal = {
  dishes: Array<{ name: string }>;
  macros: Macros;
};

type JamixCachedDay = {
  date: string;
  meals: JamixCachedMeal[];
};

type JamixApiResponse = Array<{
  menuTypes?: Array<{
    menuTypeId: number;
    menus?: Array<{
      days?: Array<{
        date: number;
        mealoptions?: Array<{
          menuItems?: Array<{ name: string }>;
        }>;
      }>;
    }>;
  }>;
}>;

const JAMIX_MENU_CACHE = jamixMenus as Record<string, JamixCachedDay[]>;
const EMPTY_MACROS: Macros = { kcal: 0, p: 0, h: 0, r: 0 };

const SCHOOLS: SchoolConfig[] = [
  {"id":"alavus","name":"Alavus (Kyläkoulut)","customer":"alavus","kitchen":"alavudenkyläkoulut","menu":"alavudenkoulut"},
  {"id":"7a65addc-a95a-45b4-a67a-cb31b41159be","name":"Aleksis Kiven peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"luovi","name":"Ammattiopisto Luovi","customer":"luovi","kitchen":"ravintolakasari","menu":"ravintolakasari"},
  {"id":"260fcd53-418e-4624-a277-28812295b7cb","name":"Arabian peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"118adb53-f6d5-4140-b698-53e9618f53a7","name":"Aurinkolahden peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"4b8075a7-4428-47be-be54-1eb1e03ce4e5","name":"Aurinkolahden peruskoulu, Auringonpilkku (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"24c2ced8-7b7f-444b-a63e-17d703e96b98","name":"Aurinkolahden peruskoulu, Kanava (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"eac91449-c44a-4bd6-92b5-7e9c2dda0cfd","name":"Brändö lågstadieskola och Brändö gymnasium (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"e014d585-bfc2-4be8-bdd4-150c8b41993b","name":"Crusellin peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"dc6eb5af-e22f-47e4-9f31-a30edc0ba6d5","name":"Degerö lågstadieskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"842c5111-5acb-47f5-b4c4-8df6cbd2e3bf","name":"Drumsö lågstadieskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b6e4c9ca-7141-4873-832b-8fb079f65fe9","name":"Etu-Töölön lukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"3c1966e3-e445-4875-8b4d-ed4c0167843f","name":"Grundskolan Norsen, Kronohagen (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b8eb20b2-a641-4d51-9634-21ea50ffb842","name":"Grundskolan Norsen, Norsen (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"hanko","name":"Hanko","customer":"hanko","kitchen":"koulut","menu":"ruokalista"},
  {"id":"01e082e9-9e2c-4b9d-a987-65091d4e7b9d","name":"Helsingin kuvataidelukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"4cbcf4d3-2469-47aa-b023-fca58a14cc3a","name":"Helsingin luonnontiedelukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"74415482-4d20-4d1c-bf83-4833b54bcaf6","name":"Hertsikan ala-aste, Ahmatie (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"8175d11c-60ae-42e1-b926-6033bf137b5a","name":"Hertsikan ala-aste, Hillerikuja (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"48d4d6d8-796e-4db5-808e-37445d345973","name":"Herttoniemenrannan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"73523ef1-98de-4236-8096-d136f85cea7d","name":"Hietakummun ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"hollola","name":"Hollola","customer":"hollola","kitchen":"koulut","menu":"ruokalista"},
  {"id":"af0ab66c-31dd-492d-88c9-5e592c7a042a","name":"Hoplaxskolan, Kårböle (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"500bcdd6-7ba8-4bb8-a675-07e85b793c54","name":"Hoplaxskolan, Munksnäs (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"hyria","name":"Hyria","customer":"hyria","kitchen":"tuotanto","menu":"Ruokalista"},
  {"id":"ikaalinen","name":"Ikaalinen","customer":"ikaalinen","kitchen":"koulut","menu":"ruokalista"},
  {"id":"786b430e-2534-488a-b378-d2fc516de3ee","name":"Jätkäsaaren peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"de72bce5-241c-47bb-8cce-40db946ed8f2","name":"Kaisaniemen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"kalajoki","name":"Kalajoki","customer":"kalajoki","kitchen":"koulut","menu":"ruokalista"},
  {"id":"108122fc-caca-402e-9330-9f1bf4dce528","name":"Kalasataman peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"3e43d75d-73af-4813-a6f8-4be945d18d31","name":"Kallion ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"17fb8dbe-cf16-41a4-ba77-bb2ed7d66ae9","name":"Kallion lukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"a0a6d28f-c837-4744-bffa-4aa3ea5b9c60","name":"Kankarepuiston peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"9843c6d3-c75f-46ec-906d-5108d66c3cde","name":"Kannelmäen peruskoulu, Kuninkaantammi (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"kannus","name":"Kannus","customer":"kannus","kitchen":"koulut","menu":"koulut"},
  {"id":"77094749-ccae-4d06-8fe8-d241e0c615b2","name":"Karviaistien koulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"da0d0563-9f64-4295-90ae-7f222fe1aa0c","name":"Katajanokan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"kauhava","name":"Kauhava","customer":"kauhava","kitchen":"koulut","menu":"ruokalista"},
  {"id":"kauniainen","name":"Kauniainen","customer":"kauniainen","kitchen":"koulut","menu":"koulu"},
  {"id":"kemijarvi","name":"Kemijärvi","customer":"kemijarvi","kitchen":"koulut","menu":"ruokalista"},
  {"id":"kirkkonummi","name":"Kirkkonummi","customer":"kirkkonummi","kitchen":"koulut","menu":"ruokalista"},
  {"id":"f5b0baf0-83ec-4550-b412-1c87a878d542","name":"Kontulan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"58136a06-5868-4e99-8b7a-fc47d48965f5","name":"Koskelan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"68f51bf1-a551-4078-bd85-dc644da425df","name":"Koskelan ala-aste väistö (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"dcbedc30-b131-4693-82e6-a9a20474090a","name":"Kottby grundskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b44cb3e1-709d-4df0-bd06-80250444f176","name":"Kottby lågstadieskola, Arabias kvartersskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"53235dce-80a7-47d7-9398-89fe4f44f82f","name":"Kruununhaan yläaste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"408eab0f-9dd5-4255-93c1-fe286f0094f1","name":"Kruunuvuorenrannan pk (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"61e76feb-eaf4-43da-ad1f-52cb4394a419","name":"Kulosaaren ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"bf77ad95-1e68-4f36-a17e-fc4b1d16923b","name":"Kuvataidelukio Siltavuorenpenger (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"d2973a9b-2332-49a1-ba69-e3b23cefda2e","name":"Käpylän peruskoulu, Hykkylä (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"5c9380b2-ad66-4e31-800a-1391a17b9593","name":"Käpylän peruskoulu, Untamo (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"542b0174-fa72-40a0-b141-e4d3ab29e5d0","name":"Laajasalon peruskoulu, Alatalo (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"878990b8-50ac-4bc4-ade2-4a29f058f645","name":"Laajasalon peruskoulu, Ylätalo (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b52ed523-5130-466d-a76e-8d32de3b94f4","name":"Laakavuoren ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"lappia","name":"Lappia","customer":"lappia","kitchen":"aurinko","menu":"aurinko"},
  {"id":"laukaa","name":"Laukaa","customer":"laukaa","kitchen":"koulu","menu":"Ruokalista"},
  {"id":"9e561aa9-a0dd-412e-a06e-0cb8e7affc45","name":"Lauttasaaren ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"lieto","name":"Lieto","customer":"lieto","kitchen":"koulut","menu":"kouluruokalista"},
  {"id":"loimaa","name":"Loimaa","customer":"loimaa","kitchen":"koulut","menu":"ruokalista"},
  {"id":"c5aac27e-37a2-44e0-b446-dda9b2fb0fee","name":"Malmin peruskoulu, Pohjola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"33e53443-809f-4c9f-a916-681a6617f0b6","name":"Malmin peruskoulu, Talvela (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"marttila","name":"Marttila","customer":"marttila","kitchen":"koulut","menu":"ruokalista"},
  {"id":"44cd9555-0d84-4060-943d-543a39c5187c","name":"Maunulan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"737d9be1-762c-48d9-a8a7-732567590165","name":"Meilahden ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"64f95740-4ab4-4bcc-abb8-dffd87ee9b9e","name":"Meilahden yläaste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"808100f5-f8a0-420f-ad02-1562f4894812","name":"Mellunmäen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"beb71a3b-3cca-4167-ab15-2311d2f6d3bc","name":"Merilahden peruskoulu, Jaluspolku (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"bedbcfbb-c4ab-4f7b-949b-620cba704a43","name":"Merilahden peruskoulu, Kallvikinniementie (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b8124ee9-a949-449f-a362-b6011c4c79b7","name":"Metsolan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"a0a8db64-25f3-4810-ba72-8c6b8ec4ede5","name":"Minervaskolan (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"muhos","name":"Muhos","customer":"muhos","kitchen":"muhoskoulut","menu":"ruokalista"},
  {"id":"99cc354d-3505-40de-9ba2-a364bd44649e","name":"Munkkiniemen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"8e543111-73d9-42db-9ba1-7a494b97b1ff","name":"Munkkiniemen ala-aste, Lehtisaaren sivukoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"naantali","name":"Naantali","customer":"naantali","kitchen":"koulut","menu":"koulut"},
  {"id":"c2c351b1-01d1-4352-982e-ca632cc330ab","name":"Naulakallion koulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"1693b22c-4556-4cd8-af9b-d17d2184b7b9","name":"Nordsjö lågstadieskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"30a87d3f-a6df-41da-a3b2-c868d6065ce0","name":"Norsen grundskolan Cygnaeus (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"nousiainen","name":"Nousiainen","customer":"nousiainen","kitchen":"koulut","menu":"koulut"},
  {"id":"nurmes","name":"Nurmes","customer":"nurmes","kitchen":"koulut","menu":"koulut"},
  {"id":"orimattila","name":"Orimattila","customer":"orimattila","kitchen":"koulut","menu":"Koulut"},
  {"id":"osao-kaukovainio","name":"OSAO Kaukovainio","customer":"93077","kitchen":"74","menu":"127","provider":"jamix"},
  {"id":"792f53bf-a557-4ce4-a891-1a47b841b6d3","name":"Oulunkylän ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"cf766725-4aae-41c9-98d3-1d347c96ab5f","name":"Oulunkylän ala-aste, Veräjälaakso (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"60fb23e9-5726-44e5-8211-0f00e26406a4","name":"Pakilan ala-aste, sivukoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"e07e5568-a389-42a8-9d30-29956e0e7c80","name":"Pakilan peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"243ed2fe-1ac1-4714-bd76-d135a76fb36c","name":"Paloheinän ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"6cc04fe3-e192-432f-ae4c-49fde859f793","name":"Pasilan peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"35c7ff31-bc3f-4867-96f8-ddacbb0b331f","name":"Pasilan peruskoulu, Aurinkokello (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"d1267916-95be-41f2-8b68-f1a2f9b3a9ce","name":"Pasilan peruskoulu, Kustinpolku (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"34e6c2b2-0e6e-41bf-b1ca-5125b8946ee5","name":"Pasilan peruskoulu, Länsi-Pasila (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"787fb3cd-c7bd-40af-bfe4-a1e9da5c4515","name":"Pihlajamäen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"4b479cf7-1e05-49ac-9b56-b6631aafd5df","name":"Pihlajiston ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"c4fe02fc-d93e-4747-93c9-39791a5c1da4","name":"Pihlajiston ala-aste, Viikinmäki (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b2c3d8ce-1e08-46ef-b1b0-d6d9f40758e0","name":"Pohjois-Haagan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"6a633439-80f9-4989-b2ce-2f00bc47a10e","name":"Poikkilaakson ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"929f73e3-e7cd-4f0b-b0bc-a376054591ea","name":"Porolahden peruskoulu, Kreijarinkuja (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"e08d7df3-90b7-4dfa-b303-60b49cdaa009","name":"Porolahden peruskoulu, Roihuvuori (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"e12ee1a7-70db-45a0-a200-b6321f633375","name":"Porolahden peruskoulu, Satumaanpolku (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"d0eba0ed-6501-44ea-a44d-2ec2c2bcb4d1","name":"Puistopolun peruskoulu, alapuisto (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"01944ca2-fdf1-499c-bcef-70b80a4e76fc","name":"Puistopolun peruskoulu, yläpuisto (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"51c24aa2-34b7-4ded-8a17-91e252f48484","name":"Pukinmäenkaaren peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"cfbd874f-d581-47bb-a802-112bfa034257","name":"Pukinmäenkaaren peruskoulu, Kenttäpolku (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"88ce4f7a-2a80-49da-972c-dd3ed9d8db90","name":"Puotilan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"ae2974a5-79b4-4b5c-82ca-dc19d2f5a72f","name":"Ressun lukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"dc926255-d2f4-4646-967d-df01e946bac2","name":"Ressun peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"71e0eb57-4821-478c-933b-4a81ea48b7fb","name":"Ressun peruskoulun ja lukion lisätilat R23 (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"9bf5acd7-a9fa-443b-9c46-4a11f291bb24","name":"Roihuvuoren ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"rusko","name":"Rusko","customer":"rusko","kitchen":"koulut","menu":"ruskonkoulut"},
  {"id":"d8b2cb56-37b9-4171-a97c-3cf5e8124b1f","name":"Santahaminan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"2b624991-b729-48f5-9491-431f23175acf","name":"Saukonpaadenranta väistötila  (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"ce4712d6-bc38-4f68-84b2-362f0f290c1c","name":"Siltamäen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"sipoo","name":"Sipoo","customer":"sipoo","kitchen":"koulut","menu":"ruokalistakoulut"},
  {"id":"9461bf63-baa8-4142-81f8-d93b39f6a2ce","name":"Snellmanin ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"dbc7969f-cc8e-4af2-8174-eed8fea269b1","name":"Solakallion koulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"somero","name":"Somero","customer":"somero","kitchen":"koulut","menu":"japaivakodit"},
  {"id":"4a841ad5-0b49-4ad6-a54d-c003dfbeacab","name":"Sophie Mannerheimin koulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"sskky","name":"SSKKY","customer":"sskky","kitchen":"ravintolasatama","menu":"Salonseudunkoulutuskuntayhtymä"},
  {"id":"bc61e0cb-475d-4836-a642-ca0c3bda0c6d","name":"Stadin ammattiopisto, Muotoilijankatu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"708573a3-2cee-4355-9059-8ee1e4b34b82","name":"Stadin ammattiopisto, Myllypuro (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"76ac3236-1fff-4f3c-bdf1-8c5b22fc6f34","name":"Stadin ammattiopisto, Prinsessantie (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"80c38404-957c-4986-bfcd-21f06c26d695","name":"Stadin ammattiopisto, Roihupelto (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"a6c6fb65-910b-459d-b5ec-5303fdcd8647","name":"Staffansby lågstadieskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"808f5363-15ad-4b5f-b767-3ca787af4054","name":"Suomenlinnan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"6eb027aa-54bf-46a0-b30f-77e6228642f4","name":"Suutarilan peruskoulu, Esko (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"7dd7dbbe-8b61-4429-84d1-741c9b095acb","name":"Suutarilan peruskoulu, Nummi (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"66c1f31b-c7f5-4243-9ce3-fb870e3d49f7","name":"Suutarilan peruskoulu, Suutari (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"89326001-94e1-440f-b94e-2e52f70d443f","name":"Tahvonlahden ala-aste  (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"taipalsaari","name":"Taipalsaari","customer":"taipalsaari","kitchen":"koulut","menu":"ruokalista"},
  {"id":"4658a645-e55d-4e0d-acff-3d41a47abc84","name":"Taivallahden peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"d6ebe635-4f64-4831-879c-998a78c1ecb9","name":"Tehtaankadun ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"1f0720d0-2d5c-4817-9238-d98e22f244d3","name":"Toivolan koulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"66a8d205-c38f-4767-b1ac-5dfc935a7149","name":"Torpparinmäen peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"7eb782a8-8ce9-48f7-aca3-5ec04dc26b36","name":"Tölö gymnasium (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"41e6e674-f5c0-4468-8fdc-a661a5c938a2","name":"Töölön ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"ulvila","name":"Ulvila","customer":"ulvila","kitchen":"harjunpaa","menu":"koulut"},
  {"id":"utajarvi","name":"Utajärvi","customer":"muhos","kitchen":"muhoskoulut","menu":"ruokalista"},
  {"id":"vaala","name":"Vaala","customer":"muhos","kitchen":"muhoskoulut","menu":"ruokalista"},
  {"id":"a61162f6-52b0-4f18-8568-f3540ec95e8d","name":"Vallilan ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"7efcfb78-5057-494b-b0c1-295cffc4fad0","name":"Vattuniemen ala-aste (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"c90f9763-1b4a-4540-9c6b-7ebd5c23cad9","name":"Vesalan peruskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"909a472d-d50b-4045-9529-e27f1ee88d0f","name":"Vuoniityn peruskoulu Heteniityntie (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"b725f049-a55c-4641-b586-ecf8685adf63","name":"Vuoniityn peruskoulu, Koukkusaari (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"5982518f-8cad-4ced-8b8d-a354d43bc4ea","name":"Vuoniityn peruskoulu, Venemestarintie (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"4da5ccab-f1a2-45b6-a1f2-957636308ae2","name":"Vuosaaren lukio (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"0cfc4a5e-7b70-4e79-832e-41a713f3d130","name":"Väistötila Nilsiänkatu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"wp","name":"WinNova Pori","customer":"winnova","kitchen":"pori","menu":"ruokalista"},
  {"id":"wr","name":"WinNova Rauma","customer":"winnova","kitchen":"Rauma","menu":"ruokalista"},
  {"id":"749b4515-8293-491a-9278-26d0759d65b6","name":"Yhtenäiskoulu (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"34b55b1c-b52e-431f-9d96-6f6f84dfc018","name":"Zacharias Topeliusskolan (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"},
  {"id":"87779fcd-be6a-4ac6-a587-76a696b635b2","name":"Åshöjdens grundskola (Helsinki)","customer":"","kitchen":"","menu":"","provider":"aromi"}
];

const getHelsinkiDate = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
};

const getJamixDate = (date: number) => {
  const value = String(date);
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

async function getJamixMenu(school: SchoolConfig, dates: string[]) {
  const url = `https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/${school.customer}/${school.kitchen}?lang=fi`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Jamix API returned ${response.status}`);
  }

  const json = (await response.json()) as JamixApiResponse;
  const menuType = json[0]?.menuTypes?.find(
    (candidate) => String(candidate.menuTypeId) === school.menu,
  );

  if (!menuType) {
    throw new Error(`Jamix menu type ${school.menu} was not found`);
  }

  const cachedDays = JAMIX_MENU_CACHE[school.id] ?? [];
  const daysByDate = new Map<string, JamixCachedMeal[]>();

  for (const day of menuType.menus?.flatMap((menu) => menu.days ?? []) ?? []) {
    const date = getJamixDate(day.date);
    if (!dates.includes(date)) continue;

    const cachedMeals = cachedDays.find((cachedDay) => cachedDay.date === date)?.meals ?? [];
    const mealsByName = new Map<string, JamixCachedMeal>();

    for (const item of day.mealoptions?.flatMap((option) => option.menuItems ?? []) ?? []) {
      if (mealsByName.has(item.name)) continue;

      const cachedMeal = cachedMeals.find((meal) =>
        meal.dishes.some((dish) => dish.name === item.name),
      );
      mealsByName.set(item.name, {
        dishes: [{ name: item.name }],
        macros: cachedMeal?.macros ?? { ...EMPTY_MACROS },
      });
    }

    daysByDate.set(date, [...mealsByName.values()]);
  }

  return [...daysByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, meals]) => ({ date, meals }));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schoolId = searchParams.get('school');

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school parameter' }, { status: 400 });
  }

  const school = SCHOOLS.find(s => s.id === schoolId);

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    return getHelsinkiDate(d);
  });

  try {
    let data;

    if (school.provider === 'aromi') {
      const url = `https://script.google.com/macros/s/AKfycbyOMMz61-S8AKAZlSwK1C2gxP0WP1BDdoWkbzUWHVfhyOBXy1dyulaZfsHeWSyJBR77/exec?restaurantId=${school.id}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Aromi API returned ${res.status}`);
      }

      const json = await res.json();

      if (!json.success || !json.data) {
        throw new Error('Aromi API returned invalid data');
      }

      data = json.data.filter((day: { date: string }) => dates.includes(day.date));
    } else if (school.provider === 'jamix') {
      data = await getJamixMenu(school, dates);
    } else {
      const datesCsv = dates.join(',');
      const url = `https://api.fi.poweresta.com/publicmenu/dates/${school.customer}/${school.kitchen}/?menu=${school.menu}&dates=${datesCsv}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Poweresta API returned ${res.status}`);
      }

      data = await res.json();
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu data' }, { status: 500 });
  }
}
